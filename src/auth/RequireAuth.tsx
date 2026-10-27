import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FullScreenMessage } from '../components/Status';

/**
 * Ruta privada.
 * - Mientras se verifica la sesión: pantalla de carga (nunca el login).
 * - Sin sesión: manda a /login recordando la URL completa a la que se quería ir
 *   (salvo que la sesión terminó con "Cerrar sesión").
 */
export function RequireAuth() {
  const { status, loggedOut, retry } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullScreenMessage>Verificando sesión...</FullScreenMessage>;
  if (status === 'error') {
    return (
      <FullScreenMessage>
        <div role="alert" className="text-center">
          <p>No se pudo verificar tu sesión. El servidor no respondió.</p>
          <button type="button" className="btn-primary mt-4" onClick={retry}>Reintentar</button>
        </div>
      </FullScreenMessage>
    );
  }
  if (status === 'anonymous') {
    // Tras "Cerrar sesión" no guardamos la página: quien entre después empieza en el dashboard
    return <Navigate to="/login" replace state={loggedOut ? null : { from: location }} />;
  }
  return <Outlet />;
}

/** Ruta solo para invitados (login y registro): si ya hay sesión, no tiene sentido mostrarlas. */
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking' || status === 'error') return <FullScreenMessage>Verificando sesión...</FullScreenMessage>;
  if (status === 'authenticated') return <Navigate to={destinationFrom(location.state)} replace />;
  return <Outlet />;
}

/** Lee el `from` que dejó RequireAuth y arma la URL completa (ruta + query + hash). */
// eslint-disable-next-line react-refresh/only-export-components
export function destinationFrom(state: unknown): string {
  const from = (state as { from?: { pathname: string; search: string; hash: string } } | null)?.from;
  return from ? `${from.pathname}${from.search}${from.hash}` : '/dashboard';
}
