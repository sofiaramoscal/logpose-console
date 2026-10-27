import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/wanted', label: 'Se Busca' },
  { to: '/news', label: 'Noticias' },
  { to: '/sagas', label: 'Sagas' },
];

/** Sección "base" de una ruta: /wanted/abc -> /wanted. Sirve para no mover el scroll al abrir un detalle. */
const section = (path: string) => `/${path.split('/')[1] ?? ''}`;

export function Layout() {
  const { team, logout } = useAuth();
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  // Al cambiar de SECCIÓN subimos el scroll. Entre /wanted y /wanted/:id (o /news y /news/:id)
  // NO, para que el listado quede exactamente donde estaba.
  useEffect(() => {
    if (section(prevPath.current) !== section(pathname)) window.scrollTo(0, 0);
    prevPath.current = pathname;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-amber-400 focus:px-3 focus:py-1 focus:text-slate-950">
        Saltar al contenido
      </a>
      <header className="z-30 border-b border-slate-800 bg-slate-950/95 lg:sticky lg:top-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold tracking-tight text-amber-300">Log Pose Console</span>
          <nav aria-label="Principal" className="flex flex-wrap gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-400">{team?.name} · {team?.code}</span>
            <button type="button" onClick={logout} className="btn">Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
