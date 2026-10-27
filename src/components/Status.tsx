import type { ReactNode } from 'react';
import type { ApiError } from '../api/client';

export function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300" role="status">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400 motion-reduce:animate-none" />
      {label}
    </span>
  );
}

/** Error accionable: muestra el mensaje y un botón para reintentar. */
export function ErrorBox({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  // 423 LOG_POSE_REQUIRED: no es una falla, es el bloqueo del Grand Line hasta aprobar el CP3
  if (error.code === 'LOG_POSE_REQUIRED') {
    return (
      <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
        <p className="font-semibold">🔒 Grand Line bloqueado</p>
        <p className="mt-1">{error.message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn mt-3 border-amber-400/50 hover:bg-amber-500/20">
            Volver a comprobar
          </button>
        )}
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <span>{error.message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn border-rose-400/50 hover:bg-rose-500/20">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center text-slate-400">
      <p className="font-medium text-slate-300">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}
