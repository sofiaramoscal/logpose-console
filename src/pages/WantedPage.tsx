import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ApiError, isCanceled, toApiError } from '../api/client';
import { getCrews, getWanted } from '../api/endpoints';
import type { WantedQuery } from '../api/endpoints';
import { FRUIT_FILTERS, PAGE_SIZES, WANTED_SORTS, WANTED_STATUSES } from '../api/types';
import type { PageSize, WantedPage as WantedPageData } from '../api/types';
import { EmptyState, ErrorBox, Spinner } from '../components/Status';
import { berries, label } from '../lib/format';
import { buildParams, sameParams, parseEnum, parseEnumWithDefault, parseNonNegativeInt, useDebounced } from '../lib/params';
import { useResource } from '../lib/useResource';

const DEFAULTS = { page: 0, size: 20, sort: 'bounty,desc', status: '', crewId: '', fruit: '', q: '' } as const;
const MAX_Q = 100;

/**
 * La URL es la ÚNICA fuente de verdad: leemos todo de ahí.
 * Cualquier valor inválido (?size=7, ?status=PIRATA, ?page=-3) cae a su valor por defecto.
 */
function readQuery(params: URLSearchParams): WantedQuery {
  const size = Number(params.get('size'));
  return {
    page: parseNonNegativeInt(params.get('page'), DEFAULTS.page),
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULTS.size,
    sort: parseEnumWithDefault(params.get('sort'), WANTED_SORTS, DEFAULTS.sort),
    status: parseEnum(params.get('status'), WANTED_STATUSES),
    crewId: (params.get('crewId') ?? '').trim().slice(0, 200),
    fruit: parseEnum(params.get('fruit'), FRUIT_FILTERS),
    q: (params.get('q') ?? '').trim().slice(0, MAX_Q),
  };
}

interface ListState {
  data: WantedPageData | null;
  loading: boolean;
  error: ApiError | null;
}

export function WantedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);
  const queryKey = JSON.stringify(query); // identifica "qué estamos pidiendo"

  const crews = useResource(signal => getCrews(signal), 'crews');

  // Escribe la query en la URL. Cambiar filtro/búsqueda/orden/tamaño vuelve a la página 0.
  const updateQuery = (patch: Partial<WantedQuery>, options: { resetPage?: boolean; replace?: boolean } = {}) => {
    const next = { ...query, ...patch };
    if (options.resetPage ?? true) next.page = 0;
    setSearchParams(buildParams({ ...next }, DEFAULTS), { replace: options.replace ?? false });
  };

  // ---- 1. URL con valores inválidos: la reescribimos con los valores válidos (sin romper la vista) ----
  useEffect(() => {
    const canonical = buildParams({ ...query }, DEFAULTS);
    // Un crewId que no existe en /crews también se considera inválido
    if (query.crewId && crews.data && !crews.data.some(c => c.id === query.crewId)) canonical.delete('crewId');
    // Solo reescribimos si hay valores inválidos (no por el orden de los parámetros)
    if (!sameParams(canonical, searchParams)) setSearchParams(canonical, { replace: true });
  }, [query, searchParams, setSearchParams, crews.data]);

  // ---- 2. Búsqueda con debounce: el input es estado local; la URL se actualiza 400 ms después ----
  const [qInput, setQInput] = useState(query.q);
  const debouncedQ = useDebounced(qInput, 400);
  useEffect(() => {
    const clean = debouncedQ.trim().slice(0, MAX_Q);
    if (clean !== query.q) updateQuery({ q: clean }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);
  // Si la URL cambia desde afuera (atrás/adelante, link compartido), el input se sincroniza
  useEffect(() => {
    setQInput(current => (current.trim() === query.q ? current : query.q));
  }, [query.q]);

  // ---- 3. Carga protegida contra respuestas antiguas ----
  const [state, setState] = useState<ListState>({ data: null, loading: true, error: null });
  const latestRequest = useRef(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    const controller = new AbortController();
    setState(prev => ({ ...prev, loading: true, error: null })); // conservamos los datos anteriores: el layout no salta

    getWanted(query, controller.signal)
      .then(data => {
        if (requestId !== latestRequest.current) return; // llegó tarde: ya hay una request más nueva
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (isCanceled(err) || requestId !== latestRequest.current) return;
        setState(prev => ({ ...prev, loading: false, error: toApiError(err) }));
      });

    return () => controller.abort(); // cambió la query: cancelamos la request anterior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, attempt]);

  const { data, loading, error } = state;

  // ---- 4. Nunca quedarse en una página que no existe (ej. ?page=40 con 3 páginas) ----
  useEffect(() => {
    if (!data || loading || data.page !== query.page) return;
    const lastPage = Math.max(0, data.totalPages - 1);
    if (query.page > lastPage) updateQuery({ page: lastPage }, { resetPage: false, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading]);

  const totalPages = data?.totalPages ?? 0;
  const hasFilters = Boolean(query.status || query.crewId || query.fruit || query.q);
  const rows = data?.content ?? [];

  return (
    <section aria-labelledby="wanted-title" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="wanted-title" className="text-2xl font-semibold">Carteles de "Se Busca"</h1>
        {/* espacio reservado: aparezca o no el spinner, nada se mueve */}
        <div className="h-6 min-w-36">{loading && <Spinner label="Actualizando..." />}</div>
      </div>

      {/* ---- Filtros ---- */}
      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block text-slate-400">Buscar por nombre o epíteto</span>
          <input type="search" className="input w-full" maxLength={MAX_Q} value={qInput}
            onChange={e => setQInput(e.target.value)} placeholder="Ej. Ancla Roja" />
        </label>
        <Select label="Estado" value={query.status}
          onChange={v => updateQuery({ status: parseEnum(v, WANTED_STATUSES) })}
          options={[['', 'Todos'], ...WANTED_STATUSES.map(s => [s, label(s)] as const)]} />
        <Select label="Tripulación" value={query.crewId}
          onChange={v => updateQuery({ crewId: v })}
          options={[['', 'Todas'], ...(crews.data ?? []).map(c => [c.id, c.name] as const)]} />
        <Select label="Fruta del diablo" value={query.fruit}
          onChange={v => updateQuery({ fruit: parseEnum(v, FRUIT_FILTERS) })}
          options={[['', 'Todas'], ...FRUIT_FILTERS.map(f => [f, label(f)] as const)]} />
        <Select label="Ordenar por" value={query.sort}
          onChange={v => updateQuery({ sort: parseEnumWithDefault(v, WANTED_SORTS, DEFAULTS.sort) })}
          options={WANTED_SORTS.map(s => [s, label(s)] as const)} />
        {hasFilters && (
          <div className="sm:col-span-2 lg:col-span-6">
            <button type="button" className="btn" onClick={() => { setQInput(''); setSearchParams(buildParams({ ...DEFAULTS, size: query.size, sort: query.sort }, DEFAULTS)); }}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* espacio reservado para el error */}
      <div className="min-h-14">{error && <ErrorBox error={error} onRetry={() => setAttempt(a => a + 1)} />}</div>

            {/* Alto reservado = una página completa (size filas): con datos, vacío o cargando mide lo mismo */}
      <div className={`card wanted-results overflow-x-auto transition-opacity ${loading && data ? 'opacity-60' : ''}`} aria-busy={loading}
        style={{ minHeight: `calc(${query.size} * 3.5rem + 74px)` }}>
        {data && data.totalElements === 0 ? (
          <EmptyState title="Sin resultados">Ningún cartel coincide con estos filtros. Prueba con otros o límpialos.</EmptyState>
        ) : (
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="h-10">
                <th className="py-2 pr-3 font-medium">Nombre</th>
                <th className="py-2 pr-3 font-medium">Recompensa</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 pr-3 font-medium">Tripulación</th>
                <th className="py-2 pr-3 font-medium">Fruta</th>
                <th className="py-2 font-medium">Amenaza</th>
              </tr>
            </thead>
            <tbody>
              {data
                ? rows.map(w => (
                    <tr key={w.id} className="h-14 border-t border-slate-800">
                      <td className="py-2 pr-3">
                        {/* Conservamos ?filtros en el link: al volver, el listado queda igual */}
                        <Link to={{ pathname: `/wanted/${w.id}`, search: location.search }} data-wanted-link={w.id}
                          className="font-medium hover:text-amber-300">
                          {w.name}
                        </Link>
                        <span className="block text-xs text-slate-400">"{w.epithet}"</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-amber-200">{berries(w.bounty)}</td>
                      <td className="py-2 pr-3">{label(w.status)}</td>
                      <td className="py-2 pr-3">{w.crew.name}</td>
                      <td className="py-2 pr-3">{w.devilFruit ? label(w.devilFruit.type) : '—'}</td>
                      <td className="py-2" aria-label={`Amenaza ${w.threatLevel} de 5`}>{'★'.repeat(w.threatLevel)}</td>
                    </tr>
                  ))
                : Array.from({ length: query.size }, (_, i) => (
                    <tr key={i} className="h-14 border-t border-slate-800" aria-hidden>
                      <td colSpan={6}><div className="h-5 animate-pulse rounded bg-slate-800/70 motion-reduce:animate-none" /></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Paginación del servidor ---- */}
      <nav aria-label="Paginación" className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="btn" disabled={query.page === 0}
          onClick={() => updateQuery({ page: query.page - 1 }, { resetPage: false })}>
          ← Anterior
        </button>
        <span className="tabular-nums text-slate-300" aria-live="polite">
          Página {totalPages === 0 ? 0 : Math.min(query.page + 1, totalPages)} de {totalPages} · {data?.totalElements ?? 0} carteles
        </span>
        <button type="button" className="btn" disabled={query.page + 1 >= totalPages}
          onClick={() => updateQuery({ page: query.page + 1 }, { resetPage: false })}>
          Siguiente →
        </button>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-slate-400">Por página</span>
          <select className="input py-1" value={query.size} onChange={e => updateQuery({ size: Number(e.target.value) as PageSize })}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </nav>

      {/* El detalle /wanted/:id se dibuja encima: el listado nunca se desmonta */}
      <Outlet context={{ closeHref: `/wanted${location.search}` }} />
    </section>
  );
}

function Select({ label: text, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-400">{text}</span>
      <select className="input w-full" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}
