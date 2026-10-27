import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { ApiError, toApiError } from '../api/client';
import { getNews, verifyNews } from '../api/endpoints';
import type { NewsDetail as NewsDetailData, VerifyStatus } from '../api/types';
import { NewsBadges } from '../components/Badges';
import { DetailPanel } from '../components/DetailPanel';
import { ErrorBox, Spinner } from '../components/Status';
import { dateTime, label } from '../lib/format';
import { useResource } from '../lib/useResource';
import type { NewsOutletContext } from './NewsPage';

const ACTIONS: { status: VerifyStatus; text: string }[] = [
  { status: 'CONFIRMED', text: 'Confirmar' },
  { status: 'DEBUNKED', text: 'Desmentir' },
];

/** /news/:id — detalle de una noticia y verificación del rumor. */
export function NewsDetail() {
  const { id = '' } = useParams();
  const { closeHref, onNewsUpdated } = useOutletContext<NewsOutletContext>();
  const resource = useResource(signal => getNews(id, signal), id);

  // Copia local: empieza con el GET y se reemplaza SOLO cuando el servidor confirma el cambio
  const [news, setNews] = useState<NewsDetailData | null>(null);
  useEffect(() => { setNews(resource.data); }, [resource.data]);

  const [pending, setPending] = useState<VerifyStatus | null>(null);     // request en vuelo
  const [lastTried, setLastTried] = useState<VerifyStatus | null>(null); // para "Reintentar"
  const [success, setSuccess] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<ApiError | null>(null);

  const verify = async (status: VerifyStatus) => {
    if (!news || pending) return;
    setPending(status);
    setLastTried(status);
    setSuccess(null);
    setPatchError(null);
    try {
      const updated = await verifyNews(news.id, status); // PATCH /news/:id/status
      setNews(updated);
      onNewsUpdated(updated); // el feed se actualiza (o la retira si ya no cumple el filtro)
      setSuccess(`Noticia marcada como ${label(updated.status).toLowerCase()}.`);
    } catch (err) {
      const apiError = toApiError(err);
      // 409: otra persona ya la verificó con el otro estado. El servidor nos manda el estado real.
      if (apiError.code === 'NEWS_ALREADY_VERIFIED' && apiError.current) {
        setNews(apiError.current);
        onNewsUpdated(apiError.current);
      }
      setPatchError(apiError); // si no, `news` no cambia: se conserva el estado anterior
    } finally {
      setPending(null);
    }
  };

  const notFound = resource.error?.status === 404;
  const alreadyVerified = patchError?.code === 'NEWS_ALREADY_VERIFIED';

  return (
    <DetailPanel title={news ? news.title : notFound ? 'Noticia no encontrada' : 'Noticia'} closeHref={closeHref}>
      {resource.loading && !news && <Spinner label="Cargando noticia..." />}
      {notFound && <p className="text-slate-400">Esta noticia no existe en su workspace.</p>}
      {resource.error && !notFound && <ErrorBox error={resource.error} onRetry={resource.reload} />}

      {news && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2"><NewsBadges item={news} /></div>
          <p className="text-sm text-slate-400">
            {label(news.type)} · {news.island} · {news.source} · {dateTime(news.publishedAt)}
          </p>
          <div className="space-y-3 text-slate-200">
            {news.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {news.relatedWanted && (
            <p className="text-sm">
              Cartel relacionado: <Link to={`/wanted/${news.relatedWanted.id}`} className="text-amber-300 hover:underline">{news.relatedWanted.name}</Link>
            </p>
          )}

          <div className="space-y-3 border-t border-slate-800 pt-4">
            <h3 className="font-medium">Verificar rumor</h3>
            {news.status === 'RUMOR' ? (
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map(a => (
                  <button key={a.status} type="button" className="btn-primary"
                    disabled={pending !== null} aria-busy={pending === a.status}
                    onClick={() => verify(a.status)}>
                    {pending === a.status ? 'Guardando...' : a.text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Ya verificada como <strong>{label(news.status).toLowerCase()}</strong>
                {news.verifiedAt ? ` el ${dateTime(news.verifiedAt)}` : ''}. Solo los rumores se pueden verificar.
              </p>
            )}

            <div aria-live="polite" className="min-h-6">
              {success && <p className="text-sm text-emerald-300">✓ {success}</p>}
            </div>

            {patchError && (
              <ErrorBox
                error={alreadyVerified
                  ? new ApiError(`Otra persona ya la verificó como ${label(news.status).toLowerCase()}.`, 409, patchError.code)
                  : new ApiError(`No se pudo verificar: ${patchError.message} El estado sigue siendo ${label(news.status).toLowerCase()}.`, patchError.status, patchError.code)}
                onRetry={!alreadyVerified && lastTried ? () => verify(lastTried) : undefined}
              />
            )}
          </div>
        </div>
      )}
    </DetailPanel>
  );
}
