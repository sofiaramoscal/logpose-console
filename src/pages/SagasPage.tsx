import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { getSagas } from '../api/endpoints';
import { EmptyState, ErrorBox, Spinner } from '../components/Status';
import { number } from '../lib/format';
import { useViewTransitionNavigate } from '../lib/motion';
import { useResource } from '../lib/useResource';

/** /sagas — resumen. Punto de partida de la View Transition hacia cada historia. */
export function SagasPage() {
  const { data, error, loading, reload } = useResource(signal => getSagas(signal), 'sagas');
  const go = useViewTransitionNavigate();

  const open = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // permitir abrir en otra pestaña
    e.preventDefault();
    go(to);
  };

  return (
    <section aria-labelledby="sagas-title" className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 id="sagas-title" className="text-2xl font-semibold">Sagas del Grand Line</h1>
        {loading && <Spinner />}
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="Todavía no hay sagas disponibles." />}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map(s => {
          const to = `/sagas/${s.id}`;
          return (
            <li key={s.id}>
              <Link to={to} onClick={e => open(e, to)}
                className="block h-full rounded-xl border p-4 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
                style={{ backgroundColor: s.palette.surface, borderColor: s.palette.primary, color: s.palette.text }}>
                <p className="text-xs uppercase tracking-widest opacity-70">Saga {s.order}</p>
                {/* Mismo view-transition-name que el título de la historia: el navegador los "transforma" */}
                <h2 className="mt-1 text-lg font-semibold" style={{ viewTransitionName: `saga-${s.id}` }}>{s.title}</h2>
                <p className="text-sm opacity-80">{s.subtitle}</p>
                <p className="mt-3 text-sm opacity-90">{s.synopsis}</p>
                <p className="mt-3 text-xs opacity-70">
                  {s.stageCount} etapas · {number(s.totalDistanceNm)} millas · {s.firstIsland} → {s.lastIsland}
                </p>
                <span className="mt-3 inline-block text-sm font-medium" style={{ color: s.palette.primary }}>Leer la saga →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
