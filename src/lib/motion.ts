import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { To } from 'react-router-dom';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** true si el usuario activó "reducir movimiento" en su sistema. Se actualiza en vivo. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(REDUCED_QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Escucha una media query (p.ej. ancho de pantalla) y se actualiza al cambiar. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Detección de soporte de CSS Scroll-driven Animations. */
export const supportsScrollTimeline =
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()') && CSS.supports('timeline-scope: --a');

/**
 * Navegar usando la View Transition API si existe (y si no se pidió reducir movimiento).
 * Fallback: navegación normal, que funciona igual pero sin animación.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return (to: To) => {
    const reduced = window.matchMedia(REDUCED_QUERY).matches;
    if (!document.startViewTransition || reduced) {
      navigate(to);
      return;
    }
    // flushSync obliga a React a pintar la nueva ruta dentro del callback de la transición
    document.startViewTransition(() => {
      flushSync(() => navigate(to));
    });
  };
}
