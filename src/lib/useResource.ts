import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isCanceled, toApiError } from '../api/client';

interface ResourceState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Custom hook: carga un recurso al montar y cuando cambia `key`.
 * - Cancela la request anterior con AbortController (no aparecen datos viejos).
 * - Expone `reload` para el botón "Reintentar".
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
): ResourceState<T> & { reload: () => void } {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);
  const loadedKey = useRef(key);

  useEffect(() => {
    const controller = new AbortController();
    // Si cambió la key, los datos viejos son de OTRO recurso: no los mostramos
    const sameResource = loadedKey.current === key;
    loadedKey.current = key;
    setState(prev => ({ data: sameResource ? prev.data : null, error: null, loading: true }));

    fetcher(controller.signal)
      .then(data => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (isCanceled(err)) return; // la cancelamos nosotros: no es error
        setState(prev => ({ data: prev.data, error: toApiError(err), loading: false }));
      });

    // Cleanup: si cambia `key` o se desmonta el componente, abortamos la request en vuelo
    return () => controller.abort();
    // `fetcher` cambia en cada render; `key` es lo que identifica qué queremos cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt(a => a + 1), []);
  return { ...state, reload };
}
