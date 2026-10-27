import { Link } from 'react-router-dom';

/** Página 404: cualquier ruta que no existe. */
export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-6xl font-bold text-amber-300">404</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-100">Esta isla no aparece en ningún mapa</h1>
        <p className="mt-1 text-slate-400">La página que buscas no existe.</p>
        <Link to="/dashboard" className="btn-primary mt-6 inline-flex">Volver al dashboard</Link>
      </div>
    </div>
  );
}
