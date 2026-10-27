import { useEffect, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import type { NewsFilters } from '../api/endpoints';
import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES } from '../api/types';
import type { NewsItem } from '../api/types';
import { NewsBadges } from '../components/Badges';
import { EmptyState, ErrorBox, Spinner } from '../components/Status';
import { dateTime, label } from '../lib/format';
import { buildParams, sameParams, parseEnum } from '../lib/params';
import { useNewsFeed } from '../lib/useNewsFeed';

const DEFAULTS = { type: '', priority: '', status: '' } as const;

/** Lo que el feed le pasa al detalle (ruta hija) con <Outlet context>. */
export interface NewsOutletContext {
  closeHref: string;
  onNewsUpdated: (item: NewsItem) => void;
}

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Filtros leídos de la URL (valores inválidos = sin filtro)
  const filters: NewsFilters = useMemo(() => ({
    type: parseEnum(searchParams.get('type'), NEWS_TYPES),
    priority: parseEnum(searchParams.get('priority'), NEWS_PRIORITIES),
    status: parseEnum(searchParams.get('status'), NEWS_STATUSES),
  }), [searchParams]);

  // URL con valores inválidos: la limpiamos (sin romper la vista)
  useEffect(() => {
    const canonical = buildParams({ ...filters }, DEFAULTS);
    // Solo reescribimos si hay valores inválidos (no por el orden de los parámetros)
    if (!sameParams(canonical, searchParams)) setSearchParams(canonical, { replace: true });
  }, [filters, searchParams, setSearchParams]);

  const feed = useNewsFeed(filters);
  const setFilter = (patch: Partial<NewsFilters>) => setSearchParams(buildParams({ ...filters, ...patch }, DEFAULTS));

  // ---- Infinite scroll: un "sentinel" invisible al final; al verlo, pedimos la siguiente página ----
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { loadMore } = feed;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !feed.hasMore || feed.status !== 'idle') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) loadMore();
    }, { rootMargin: '400px 0px' }); // empezamos 400 px antes de llegar al final
    observer.observe(el);
    // Se recrea tras cada página: si el sentinel sigue visible (pantalla grande), vuelve a disparar
    return () => observer.disconnect();
  }, [feed.items.length, feed.hasMore, feed.status, loadMore]);

  const outletContext: NewsOutletContext = { closeHref: `/news${location.search}`, onNewsUpdated: feed.reconcile };

  return (
    <section aria-labelledby="news-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 id="news-title" className="text-2xl font-semibold">Noticias del mundo</h1>
        <span className="text-sm text-slate-400" aria-live="polite">
          {feed.status === 'loading-first' ? 'Cargando...' : `${feed.items.length} noticias cargadas`}
        </span>
      </div>

      <div className="card grid gap-3 sm:grid-cols-3" role="search">
        <FilterSelect label="Tipo" value={filters.type} options={NEWS_TYPES} onChange={v => setFilter({ type: parseEnum(v, NEWS_TYPES) })} />
        <FilterSelect label="Prioridad" value={filters.priority} options={NEWS_PRIORITIES} onChange={v => setFilter({ priority: parseEnum(v, NEWS_PRIORITIES) })} />
        <FilterSelect label="Estado" value={filters.status} options={NEWS_STATUSES} onChange={v => setFilter({ status: parseEnum(v, NEWS_STATUSES) })} />
      </div>

      {feed.status === 'error-first' && feed.error && <ErrorBox error={feed.error} onRetry={feed.retry} />}

      {feed.status !== 'loading-first' && feed.status !== 'error-first' && feed.items.length === 0 && (
        <EmptyState title="No hay noticias con estos filtros." />
      )}

      <ul className="space-y-2">
        {feed.items.map(n => (
          <li key={n.id}>
            {/* El link conserva los filtros (?status=...) para volver al mismo feed */}
            <Link to={{ pathname: `/news/${n.id}`, search: location.search }} data-news-link={n.id}
              className="card block transition-colors hover:border-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <NewsBadges item={n} />
                <span className="ml-auto text-xs text-slate-500">{dateTime(n.publishedAt)}</span>
              </div>
              <p className="mt-2 font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-slate-400">{n.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{label(n.type)} · {n.island} · {n.source}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Zona final: sentinel + cargando / error con reintento / fin de lista */}
      <div ref={sentinelRef} className="flex min-h-16 items-center justify-center">
        {(feed.status === 'loading-first' || feed.status === 'loading-more') && <Spinner label="Cargando noticias..." />}
        {feed.status === 'error-more' && feed.error && <div className="w-full"><ErrorBox error={feed.error} onRetry={feed.retry} /></div>}
        {feed.status === 'idle' && !feed.hasMore && feed.items.length > 0 && (
          <p className="text-sm text-slate-500">No hay más noticias · {feed.items.length} en total</p>
        )}
      </div>

      {/* El detalle se dibuja encima; el feed sigue montado => conserva posición y no vuelve a pedir nada */}
      <Outlet context={outletContext} />
    </section>
  );
}

function FilterSelect({ label: text, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-400">{text}</span>
      <select className="input w-full" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map(o => <option key={o} value={o}>{label(o)}</option>)}
      </select>
    </label>
  );
}
