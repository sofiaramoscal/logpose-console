import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { clearSession, readSession, toApiError, UNAUTHORIZED_EVENT, writeSession } from '../api/client';
import { getMe, login as loginRequest, register as registerRequest } from '../api/endpoints';
import type { LoginRequest, LoginResponse, RegisterRequest, Team, User } from '../api/types';

// 'checking' = recargamos la página y estamos validando el token guardado con GET /auth/me
// 'error'    = no se pudo verificar (servidor caído / sin red). El token se conserva para reintentar.
type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  /** true si la sesión terminó porque el usuario apretó "Cerrar sesión" */
  loggedOut: boolean;
  user: User | null;
  team: Team | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  retry: () => void;
}

// 1. Crear el contexto (fuera de cualquier componente)
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// 2. El Provider guarda el estado de la sesión y lo comparte con toda la app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  // Si hay token guardado empezamos en 'checking' (NO mostramos el login todavía)
  const [status, setStatus] = useState<AuthStatus>(() => (readSession() ? 'checking' : 'anonymous'));

  // Restaurar la sesión al recargar: validamos el token con el backend
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    getMe()
      .then(me => {
        if (cancelled) return;
        setUser(me.user);
        setTeam(me.team);
        setStatus('authenticated');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (toApiError(err).status === 401) {
          clearSession(); // token inválido o vencido: al login
          setStatus('anonymous');
        } else {
          setStatus('error'); // 500 / sin red: NO cerramos la sesión, ofrecemos reintentar
        }
      });
    return () => { cancelled = true; };
  }, [status]);

  // Si cualquier request responde 401, el interceptor avisa: volvemos al login
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setTeam(null);
      setStatus('anonymous');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Login y registro devuelven la misma respuesta: la sesión ya iniciada
  const startSession = (res: LoginResponse) => {
    writeSession({ token: res.token, expiresAt: res.expiresAt });
    setLoggedOut(false);
    setUser(res.user);
    setTeam(res.team);
    setStatus('authenticated');
  };

  const login = async (credentials: LoginRequest) => {
    try {
      startSession(await loginRequest(credentials));
    } catch (err) {
      throw toApiError(err); // el formulario muestra el error
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      startSession(await registerRequest(data));
    } catch (err) {
      throw toApiError(err);
    }
  };

  const logout = () => {
    clearSession();
    setLoggedOut(true); // logout explícito: luego NO volvemos a la página anterior
    setUser(null);
    setTeam(null);
    setStatus('anonymous');
  };

  const retry = () => setStatus('checking');

  return (
    <AuthContext.Provider value={{ status, loggedOut, user, team, login, register, logout, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Hook para leer el contexto desde cualquier componente
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
