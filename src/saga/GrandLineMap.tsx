import type { SagaStage } from '../api/types';

interface Props {
  width: number;
  height: number;
  stages: SagaStage[];
  active: number;
}

/**
 * Mapa persistente del Grand Line (SVG con las coordenadas de la API).
 * - Todas las islas en su posición (x, y).
 * - La ruta completa en punteado y la ruta RECORRIDA (hasta la etapa activa) en color.
 * - El barco se ubica en la isla de la etapa activa.
 */
export function GrandLineMap({ width, height, stages, active }: Props) {
  const points = stages.map(s => [s.island.x, s.island.y] as const);

  // Largo acumulado de la ruta hasta cada isla: sirve para "dibujar" solo lo recorrido
  const cumulative = points.reduce<number[]>((acc, [x, y], i) => {
    if (i === 0) return [0];
    const [px, py] = points[i - 1];
    return [...acc, acc[i - 1] + Math.hypot(x - px, y - py)];
  }, []);
  const total = cumulative.at(-1) ?? 0;
  const traveled = cumulative[active] ?? 0;
  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ');
  const ship = stages[active].island;
  const r = Math.max(width, height) / 90; // tamaño de las islas proporcional al mapa
  const pad = r * 9;

  return (
    // Margen alrededor del mapa para que los nombres de las islas de los bordes no se corten
    <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} className="saga-map h-full w-full" role="img"
      aria-label={`Mapa del Grand Line: el barco está en ${ship.name}, etapa ${active + 1} de ${stages.length}`}>
      {/* mar */}
      <rect x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2} rx={r * 2} className="saga-sea" />

      {/* ruta completa (punteada) */}
      <polyline points={polyline} fill="none" className="saga-route-all" strokeWidth={r / 2} strokeDasharray={`${r} ${r}`} />

      {/* ruta recorrida: misma línea, pero con dasharray = largo total y offset = lo que falta */}
      <polyline points={polyline} fill="none" className="saga-route-done" strokeWidth={r * 0.7} strokeLinecap="round"
        strokeDasharray={total} strokeDashoffset={total - traveled} />

      {/* islas */}
      {stages.map((s, i) => (
        <g key={s.id} className={i <= active ? 'saga-island visited' : 'saga-island'}>
          <circle cx={s.island.x} cy={s.island.y} r={i === active ? r * 1.6 : r} />
          {/* nombres alternados arriba/abajo para que no se encimen */}
          <text x={s.island.x} y={i % 2 === 0 ? s.island.y + r * 4.2 : s.island.y - r * 2.6} textAnchor="middle" fontSize={r * 2.4}>{s.island.name}</text>
        </g>
      ))}

      {/* barco: se mueve con transform (y una transición CSS si no hay reduced motion) */}
      <g className="saga-ship" style={{ transform: `translate(${ship.x}px, ${ship.y - r * 3}px)` }} aria-hidden>
        <path d={`M ${-r * 2.4} 0 L ${r * 2.4} 0 L ${r * 1.6} ${r * 1.4} L ${-r * 1.6} ${r * 1.4} Z`} className="saga-hull" />
        <path d={`M 0 0 L 0 ${-r * 3.2} L ${r * 1.8} ${-r * 0.6} Z`} className="saga-sail" />
      </g>
    </svg>
  );
}
