import { useOutletContext, useParams } from 'react-router-dom';
import { getWantedDetail } from '../api/endpoints';
import { DetailPanel } from '../components/DetailPanel';
import { ErrorBox, Spinner } from '../components/Status';
import { berries, date, label } from '../lib/format';
import { useResource } from '../lib/useResource';

/** /wanted/:id — detalle de un cartel, encima del listado. */
export function WantedDetail() {
  const { id = '' } = useParams();
  const { closeHref } = useOutletContext<{ closeHref: string }>();
  const { data, error, loading, reload } = useResource(signal => getWantedDetail(id, signal), id);

  const notFound = error?.status === 404;
  const maxBounty = data ? Math.max(...data.bountyHistory.map(h => h.amount), 1) : 1;

  return (
    <DetailPanel title={data ? data.name : notFound ? 'Cartel no encontrado' : 'Cartel'} closeHref={closeHref}>
      {loading && !data && <Spinner label="Cargando cartel..." />}
      {notFound && <p className="text-slate-400">Este cartel no existe en su workspace.</p>}
      {error && !notFound && <ErrorBox error={error} onRetry={reload} />}

      {data && (
        <div className="space-y-5">
          <div>
            <p className="text-lg text-slate-300">"{data.epithet}"</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-amber-300">{berries(data.bounty)}</p>
            <p className="text-sm text-slate-400">{label(data.status)} · Amenaza {'★'.repeat(data.threatLevel)}</p>
          </div>

          <dl className="grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
            <dt className="text-slate-400">Tripulación</dt><dd>{data.crew.name}</dd>
            <dt className="text-slate-400">Puesto</dt><dd>{label(data.role)}</dd>
            <dt className="text-slate-400">Fruta del diablo</dt>
            <dd>{data.devilFruit ? `${data.devilFruit.name} (${label(data.devilFruit.type)})` : 'Ninguna'}</dd>
            <dt className="text-slate-400">Edad</dt><dd>{data.age} años</dd>
            <dt className="text-slate-400">Altura</dt><dd>{data.heightCm} cm</dd>
            <dt className="text-slate-400">Visto por última vez</dt><dd>{data.lastSeen.island} · {date(data.lastSeen.seenAt)}</dd>
          </dl>

          <p className="text-slate-300">{data.bio}</p>

          <div>
            <h3 className="mb-2 font-medium">Historial de recompensas</h3>
            <ol className="space-y-1">
              {data.bountyHistory.map(h => (
                <li key={h.issuedAt} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-slate-400">{date(h.issuedAt)}</span>
                  <div className="h-2 rounded bg-slate-800">
                    <div className="h-full rounded bg-amber-400" style={{ width: `${(h.amount / maxBounty) * 100}%` }} />
                  </div>
                  <span className="tabular-nums">{berries(h.amount)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </DetailPanel>
  );
}
