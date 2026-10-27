import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getSagaStory } from '../api/endpoints';
import type { StageMetric } from '../api/types';
import { ErrorBox, Spinner } from '../components/Status';
import { berries, number } from '../lib/format';
import { supportsScrollTimeline, useMediaQuery, usePrefersReducedMotion, useViewTransitionNavigate } from '../lib/motion';
import { useResource } from '../lib/useResource';
import { GrandLineMap } from '../saga/GrandLineMap';
import '../saga/saga.css';

const formatMetric = (m: StageMetric) => {
  if (m.unit === 'berries') return berries(m.value);
  if (m.unit.startsWith('/')) return `${number(m.value)}${m.unit}`; // "3/10"
  return `${number(m.value)} ${m.unit}`; // "1.240 mn", "74 %"
};

/**
 * /sagas/:id?etapa=<slug> — la saga contada como scrollytelling.
 * - Cada etapa es una <section>; la activa es la que cruza una línea del viewport (IntersectionObserver).
 * - Mapa, colores y métricas SIEMPRE corresponden a la etapa activa.
 * - La URL guarda la etapa activa: abrir esa URL lleva directo a esa etapa.
 */
export function SagaStoryPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, error, loading, reload } = useResource(signal => getSagaStory(id, signal), id);
  const stages = data?.stages ?? [];

  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const stepsRef = useRef<HTMLOListElement>(null);
  const reduced = usePrefersReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const go = useViewTransitionNavigate();

  // Durante un salto programático ignoramos las etapas intermedias hasta llegar a la destino
  const jumpTarget = useRef<number | null>(null);

  const goToStage = (i: number, behavior: ScrollBehavior = reduced ? 'auto' : 'smooth') => {
    const el = stepRefs.current[i];
    if (!el) return;
    setActive(i);
    jumpTarget.current = i;
    window.setTimeout(() => { if (jumpTarget.current === i) jumpTarget.current = null; }, 2000);
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: isDesktop ? 'center' : 'start', behavior });
  };

  // ---- 1. Al cargar: si la URL trae ?etapa=slug, saltamos directo a esa etapa ----
  const initialSlug = useRef(searchParams.get('etapa'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!data || ready) return;
    const index = data.stages.findIndex(s => s.slug === initialSlug.current);
    if (index > 0) {
      // esperamos a que las secciones estén en el DOM
      requestAnimationFrame(() => goToStage(index, 'auto'));
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ---- 2. La URL refleja la etapa activa (replace: no llenamos el historial) ----
  useEffect(() => {
    if (!ready || !stages[active]) return;
    const slug = stages[active].slug;
    if (searchParams.get('etapa') !== slug) setSearchParams({ etapa: slug }, { replace: true });
  }, [active, ready, stages, searchParams, setSearchParams]);

  // ---- 3. Etapa activa por scroll: la sección que cruza una línea horizontal del viewport ----
  useEffect(() => {
    if (stages.length === 0) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number((entry.target as HTMLElement).dataset.index);
        if (jumpTarget.current !== null && index !== jumpTarget.current) continue;
        jumpTarget.current = null;
        setActive(index);
      }
    }, {
      // Desktop: línea en la mitad. Mobile: el mapa ocupa la parte de arriba, la línea va al 75 %.
      rootMargin: isDesktop ? '-50% 0px -50% 0px' : '-75% 0px -25% 0px',
    });
    stepRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [stages, isDesktop]);

  // ---- 4. Progreso: solo si NO hay CSS Scroll-driven Animations (comportamiento equivalente en JS) ----
  const [fallbackProgress, setFallbackProgress] = useState(0);
  useEffect(() => {
    if (supportsScrollTimeline || stages.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = stepsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScroll = rect.height - window.innerHeight;
      setFallbackProgress(totalScroll <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / totalScroll)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [stages]);

  const backToSummary = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    go('/sagas');
  };

  if (loading && !data) return <div className="py-10"><Spinner label="Cargando saga..." /></div>;
  if (error && !data) {
    return error.status === 404
      ? <p className="py-10 text-slate-400">Esta saga no existe. <Link to="/sagas" className="text-amber-300 hover:underline">Ver todas las sagas</Link></p>
      : <ErrorBox error={error} onRetry={reload} />;
  }
  if (!data || stages.length === 0) return <p className="py-10 text-slate-400">Esta saga no tiene etapas.</p>;

  const current = stages[Math.min(active, stages.length - 1)];
  // La paleta de la etapa activa pinta toda la historia
  const paletteVars = {
    '--bg': current.palette.background,
    '--surface': current.palette.surface,
    '--primary': current.palette.primary,
    '--accent': current.palette.accent,
    '--text': current.palette.text,
    '--fallback-progress': fallbackProgress,
  } as CSSProperties;

  return (
    <article className="saga-root -mx-4 -my-6 px-4 py-6" style={paletteVars} aria-labelledby="saga-title">
      <header className="mb-6 space-y-1">
        <Link to="/sagas" onClick={backToSummary} className="saga-primary text-sm hover:underline">← Volver a las sagas</Link>
        <h1 id="saga-title" className="text-3xl font-semibold" style={{ viewTransitionName: `saga-${data.saga.id}` }}>
          {data.saga.title}
        </h1>
        <p className="opacity-80">{data.saga.subtitle}</p>
        <p className="max-w-2xl pt-2 opacity-90">{data.saga.intro}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
        {/* ---- Panel persistente: sticky arriba en mobile, sticky a la derecha en desktop ---- */}
        <aside className="saga-panel sticky top-0 z-20 -mx-4 flex h-[58vh] flex-col gap-2 px-4 pb-2 pt-2 lg:top-20 lg:order-2 lg:mx-0 lg:h-[calc(100vh-7rem)] lg:px-0">
          <p className="text-sm" aria-live="polite" aria-atomic="true">
            <span className="tabular-nums">Etapa {active + 1} de {stages.length}</span>: <strong>{current.island.name}</strong>
          </p>
          <div className="h-1.5 overflow-hidden rounded bg-black/30" aria-hidden>
            <div className="saga-progress-fill h-full" />
          </div>

          <div className="saga-surface min-h-0 flex-1 overflow-hidden rounded-xl">
            <GrandLineMap width={data.map.width} height={data.map.height} stages={stages} active={active} />
          </div>

          <dl className="saga-surface grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl p-3 text-sm sm:grid-cols-4">
            {current.metrics.map(m => (
              <div key={m.key} className="min-w-0">
                <dt className="truncate text-xs opacity-75">{m.label}</dt>
                <dd className="saga-primary truncate font-semibold tabular-nums" data-metric={m.key}>{formatMetric(m)}</dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Etapas de la saga" className="flex flex-wrap gap-1">
            {stages.map((s, i) => (
              <button key={s.id} type="button" onClick={() => goToStage(i)}
                aria-current={i === active ? 'step' : undefined}
                aria-label={`Ir a la etapa ${i + 1}: ${s.title}`}
                className="h-7 w-7 rounded text-xs tabular-nums"
                style={i === active ? { background: 'var(--primary)', color: 'var(--bg)' } : { background: 'var(--surface)' }}>
                {i + 1}
              </button>
            ))}
          </nav>
        </aside>

        {/* ---- Narrativa: una sección por etapa. tabIndex=0 => se recorre con Tab ---- */}
        <ol ref={stepsRef} className="saga-steps lg:order-1">
          {stages.map((s, i) => (
            <li key={s.id}>
              <section
                ref={el => { stepRefs.current[i] = el; }}
                id={`etapa-${s.slug}`}
                data-index={i}
                tabIndex={0}
                onFocus={() => { if (jumpTarget.current === null) setActive(i); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown' && i < stages.length - 1) { e.preventDefault(); goToStage(i + 1); }
                  if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); goToStage(i - 1); }
                }}
                aria-labelledby={`stage-${s.id}`}
                className="flex min-h-[60vh] scroll-mt-[60vh] items-start py-6 outline-none focus-visible:[&>div]:ring-2 focus-visible:[&>div]:ring-[var(--primary)] lg:min-h-[75vh] lg:scroll-mt-24 lg:items-center"
              >
                <div className="saga-step-card saga-surface w-full rounded-xl p-5"
                  style={i === active ? { boxShadow: '0 0 0 2px var(--primary)' } : undefined}>
                  <p className="text-xs uppercase tracking-widest opacity-70">Etapa {s.order} · {s.island.name}</p>
                  <h2 id={`stage-${s.id}`} className="mt-1 text-xl font-semibold">{s.title}</h2>
                  <div className="mt-2 space-y-2 opacity-90">
                    {s.narrative.map((p, k) => <p key={k}>{p}</p>)}
                  </div>
                </div>
              </section>
            </li>
          ))}
        </ol>
      </div>
      {/* espacio final para que la última etapa pueda llegar a la línea de activación */}
      <div className="h-[35vh]" aria-hidden />
    </article>
  );
}
