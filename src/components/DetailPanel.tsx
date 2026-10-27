import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Panel lateral (diálogo) para los detalles /wanted/:id y /news/:id.
 * Se dibuja ENCIMA del listado, que sigue montado: así conserva su scroll y sus datos.
 * - Escape o clic afuera cierran.
 * - Al cerrar, el foco vuelve al link que lo abrió (navegación por teclado).
 */
export function DetailPanel({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const close = () => navigate(closeHref);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null; // quién lo abrió
    headingRef.current?.focus();
    return () => opener?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate(closeHref); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, closeHref]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="detail-title"
        className="h-full w-full max-w-xl overflow-y-auto overscroll-contain border-l border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="detail-title" ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">{title}</h2>
          <button type="button" className="btn" onClick={close} aria-label="Cerrar detalle">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
