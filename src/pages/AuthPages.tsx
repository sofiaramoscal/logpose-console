import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

// ¿A qué campo del formulario corresponde cada error del servidor?
const FIELD_BY_CODE: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'email',
  TEAM_NAME_TAKEN: 'teamName',
};

/** Convierte un ApiError en { campo: mensaje } + un mensaje general (si no es de un campo). */
function splitErrors(err: ApiError): { fields: Record<string, string>; general: string | null } {
  const fields = { ...err.fieldErrors };
  const field = FIELD_BY_CODE[err.code];
  if (field) fields[field] = err.message;
  const general = Object.keys(fields).length === 0 ? err.message : null;
  return { fields, general };
}

// ===================== LOGIN =====================
export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation(); // trae el `from` (a dónde se quería ir)
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError('Ingresa tu email y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      // No navegamos aquí: al quedar autenticada, <GuestOnly> redirige a donde se quería ir
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresa con el email y la contraseña de tu tripulación.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="username" value={form.email}
          onChange={v => setForm(prev => ({ ...prev, email: v }))} />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" value={form.password}
          onChange={v => setForm(prev => ({ ...prev, password: v }))} />
        {error && <p role="alert" className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        ¿Primera vez? <Link to="/register" state={location.state} className="text-amber-300 hover:underline">Registra tu tripulación</Link>
      </p>
    </AuthCard>
  );
}

// ===================== REGISTRO =====================
type RegisterField = 'teamName' | 'email' | 'password';

/** Validación local con las mismas reglas del contrato (evita requests que sabemos que fallarán). */
function validateRegister(form: Record<RegisterField, string>): Partial<Record<RegisterField, string>> {
  const errors: Partial<Record<RegisterField, string>> = {};
  const name = form.teamName.trim();
  if (name.length < 3 || name.length > 40) errors.teamName = 'El nombre debe tener entre 3 y 40 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Ingresa un email válido.';
  if (form.password.length < 8 || form.password.length > 72) errors.password = 'La contraseña debe tener entre 8 y 72 caracteres.';
  return errors;
}

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState<Record<RegisterField, string>>({ teamName: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: RegisterField, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined })); // al corregir, se limpia su error
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const local = validateRegister(form);
    setFieldErrors(local);
    if (Object.keys(local).length > 0) return;

    setSubmitting(true);
    try {
      await register({ teamName: form.teamName.trim(), email: form.email.trim(), password: form.password });
      // Registro exitoso = sesión iniciada; <GuestOnly> nos lleva al dashboard
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('No se pudo registrar.', null, 'UNKNOWN');
      const { fields, general } = splitErrors(apiError);
      setFieldErrors(fields); // ej. "Ese email ya está registrado" debajo del campo email
      setGeneralError(general);
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Registrar tripulación" subtitle="Crea la cuenta de tu equipo. Los tres integrantes usarán este email y contraseña.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Nombre de la tripulación" name="teamName" value={form.teamName} error={fieldErrors.teamName}
          onChange={v => update('teamName', v)} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} error={fieldErrors.email}
          onChange={v => update('email', v)} />
        <Field label="Contraseña (8 a 72 caracteres)" name="password" type="password" autoComplete="new-password"
          value={form.password} error={fieldErrors.password} onChange={v => update('password', v)} />
        {generalError && <p role="alert" className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{generalError}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Registrando...' : 'Registrar y zarpar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        ¿Ya tienen cuenta? <Link to="/login" state={location.state} className="text-amber-300 hover:underline">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}

// ===================== Componentes compartidos =====================
function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
      <main className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <p className="text-sm font-semibold tracking-wide text-amber-300">LOG POSE CONSOLE</p>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
        <p className="mb-5 text-sm text-slate-400">{subtitle}</p>
        {children}
      </main>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}

/** Input controlado con su error justo debajo (aria-invalid + aria-describedby para accesibilidad). */
function Field({ label, name, value, onChange, type = 'text', autoComplete, error }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`input w-full ${error ? 'border-rose-500' : ''}`}
      />
      {error && <span id={errorId} className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}
