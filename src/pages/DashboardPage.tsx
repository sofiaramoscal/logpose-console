import { Link } from 'react-router-dom';
import { getDashboard, getLogPose } from '../api/endpoints';
import { FRUIT_FILTERS, WANTED_STATUSES } from '../api/types';
import { EmptyState, ErrorBox, Spinner } from '../components/Status';
import { berries, dateTime, label } from '../lib/format';
import { useResource } from '../lib/useResource';

export function DashboardPage() {
  // Dos recursos independientes: si uno falla, el otro igual se muestra
  const summary = useResource(signal => getDashboard(signal), 'dashboard');
  const logPose = useResource(signal => getLogPose(signal), 'log-pose');
  const data = summary.data;

  return (
    <section aria-labelledby="dash-title" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="dash-title" className="text-2xl font-semibold">Dashboard</h1>
        {data && <span className="text-slate-400">{data.team.name} · {data.team.code}</span>}
        {(summary.loading || logPose.loading) && <Spinner />}
      </div>

      {/* ---- Estado del Log Pose ---- */}
      <div className="card flex flex-wrap items-center gap-4">
        <span aria-hidden className="text-3xl">{logPose.data?.grandLineUnlocked ? '🧭' : '🔒'}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Log Pose</h2>
          {logPose.error && <ErrorBox error={logPose.error} onRetry={logPose.reload} />}
          {logPose.data && (
            <>
              <p className={logPose.data.grandLineUnlocked ? 'text-emerald-300' : 'text-amber-300'}>
                {logPose.data.grandLineUnlocked ? 'Grand Line desbloqueado' : 'Grand Line bloqueado'}
              </p>
              <p className="text-sm text-slate-400">{logPose.data.message}</p>
            </>
          )}
          {!logPose.data && !logPose.error && <p className="text-sm text-slate-500">Consultando...</p>}
        </div>
      </div>

      {/* ---- Indicadores ---- */}
      {summary.error && <ErrorBox error={summary.error} onRetry={summary.reload} />}

      {!data && summary.loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-slate-800/60 motion-reduce:animate-none" />)}
        </div>
      )}

      {data && data.wanted.total === 0 && (
        <EmptyState title="Su workspace todavía no tiene carteles.">Cuando haya carteles de "Se Busca", sus indicadores aparecerán aquí.</EmptyState>
      )}

      {data && data.wanted.total > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi label="Carteles" value={String(data.wanted.total)} />
            <Kpi label="Recompensa total" value={berries(data.wanted.totalBounty)} />
            <Kpi label="Recompensa promedio" value={berries(data.wanted.averageBounty)} />
            <Kpi label="Tripulaciones" value={String(data.crews.total)} />
          </dl>

          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="Carteles por estado" total={data.wanted.total}
              rows={WANTED_STATUSES.map(s => [label(s), data.wanted.byStatus[s]])} />
            <Breakdown title="Carteles por fruta del diablo" total={data.wanted.total}
              rows={FRUIT_FILTERS.map(f => [label(f), data.wanted.byFruit[f]])} />
          </div>

          {data.crews.mostWanted && (
            <div className="card">
              <h2 className="font-medium">Tripulación más buscada</h2>
              <p className="mt-1 flex items-center gap-2">
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: data.crews.mostWanted.jollyRogerColor }} />
                {data.crews.mostWanted.name} · barco {data.crews.mostWanted.shipName}
              </p>
              <p className="text-sm text-slate-400">
                {data.crews.mostWanted.memberCount} carteles · {berries(data.crews.mostWanted.totalBounty)}
              </p>
            </div>
          )}

          <div className="card">
            <h2 className="mb-2 font-medium">Mayores recompensas</h2>
            <ol className="divide-y divide-slate-800">
              {data.topBounties.map((w, i) => (
                <li key={w.id} className="flex flex-wrap items-center gap-x-3 py-2 text-sm">
                  <span className="w-5 text-slate-500">{i + 1}.</span>
                  <Link to={`/wanted/${w.id}`} className="font-medium hover:text-amber-300">{w.name}</Link>
                  <span className="text-slate-400">"{w.epithet}"</span>
                  <span className="ml-auto tabular-nums text-amber-200">{berries(w.bounty)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-slate-500">Calculado: {dateTime(data.generatedAt)}</p>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ label: text, value }: { label: string; value: string }) {
  return (
    <div className="card min-w-0">
      <dt className="text-sm text-slate-400">{text}</dt>
      <dd className="mt-1 truncate text-2xl font-semibold tabular-nums" title={value}>{value}</dd>
    </div>
  );
}

function Breakdown({ title, total, rows }: { title: string; total: number; rows: [string, number][] }) {
  return (
    <div className="card space-y-2">
      <h2 className="font-medium">{title}</h2>
      {rows.map(([name, count]) => (
        <div key={name} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-slate-300">{name}</span>
          <div className="h-2 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
          </div>
          <span className="text-right tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}
