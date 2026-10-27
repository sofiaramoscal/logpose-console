import axios from 'axios';
import type { ApiErrorBody, NewsDetail } from './types';

const SESSION_KEY = 'logpose.session';

export interface StoredSession {
  token: string;
  expiresAt: string;
}

// ---------- Sesión en localStorage (sobrevive al recargar) ----------
export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    // Si el token ya venció, ni siquiera lo intentamos
    if (!parsed.token || Date.parse(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ---------- Instancia de Axios: la URL base sale de .env (VITE_API_BASE_URL) ----------
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
});

// Interceptor de REQUEST: agrega "Authorization: Bearer <token>" a todas las peticiones
api.interceptors.request.use(config => {
  const session = readSession();
  if (session) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

// Interceptor de RESPONSE: un 401 (fuera de login/registro) = la sesión dejó de ser válida
export const UNAUTHORIZED_EVENT = 'logpose:unauthorized';
api.interceptors.response.use(
  response => response,
  (error: unknown) => {
    const url = axios.isAxiosError(error) ? error.config?.url ?? '' : '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthForm) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)); // AuthContext lo escucha y cierra la sesión
    }
    return Promise.reject(error);
  },
);

// ---------- Errores normalizados: las pantallas solo trabajan con ApiError ----------
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  /** Errores por campo (400 VALIDATION_ERROR): { email: 'Debe ser un email válido' } */
  readonly fieldErrors: Record<string, string>;
  /** Solo en 409 NEWS_ALREADY_VERIFIED: el estado actual de la noticia */
  readonly current: NewsDetail | null;

  constructor(message: string, status: number | null, code: string, fieldErrors: Record<string, string> = {}, current: NewsDetail | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.current = current;
  }
}

/** true si cancelamos la request a propósito (AbortController). No es un error para el usuario. */
export function isCanceled(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError');
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError<ApiErrorBody>(error)) return new ApiError('Ocurrió un error inesperado.', null, 'UNKNOWN');
  if (!error.response) return new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', null, 'NETWORK_ERROR');

  const { status, data, headers } = error.response;
  const code = data?.code ?? 'UNKNOWN';
  const fieldErrors = Object.fromEntries((data?.details ?? []).map(d => [d.field, d.message]));

  if (status === 429) {
    const seconds = data?.retryAfterSeconds ?? (Number(headers['retry-after']) || null);
    return new ApiError(`Demasiadas solicitudes. Intenta de nuevo${seconds ? ` en ${seconds} s` : ' en unos segundos'}.`, status, code);
  }
  if (status >= 500) return new ApiError('El servidor tuvo un problema. Intenta de nuevo.', status, code);
  // Para el resto usamos el mensaje en español que manda el backend
  return new ApiError(data?.message ?? 'La solicitud no es válida.', status, code, fieldErrors, data?.current ?? null);
}
