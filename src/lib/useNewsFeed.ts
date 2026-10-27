import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isCanceled, toApiError } from '../api/client';
import { getNewsFeed } from '../api/endpoints';
import type { NewsFilters } from '../api/endpoints';
import type { NewsItem } from '../api/types';

const LIMIT = 20;

type FeedStatus = 'loading-first' | 'idle' | 'loading-more' | 'error-first' | 'error-more';

interface FeedState {
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  status: FeedStatus;
  error: ApiError | null;
}

const initialState: FeedState = { items: [], nextCursor: null, hasMore: true, status: 'loading-first', error: null };

/** ¿La noticia sigue cumpliendo los filtros activos? (tras verificarla puede dejar de cumplirlos) */
function matches(item: NewsItem, f: NewsFilters): boolean {
  return (!f.status || item.status === f.status) && (!f.type || item.type === f.type) && (!f.priority || item.priority === f.priority);
}

/**
 * Custom hook del feed infinito por cursor.
 * Garantías: una sola carga en vuelo · ninguna noticia dos veces (dedupe por id) ·
 * cambiar filtros nunca mezcla resultados · un error posterior NO borra lo ya cargado.
 */
export function useNewsFeed(filters: NewsFilters) {
  const filtersKey = JSON.stringify(filters);
  const [state, setState] = useState<FeedState>(initialState);

  // useRef: valores que se leen "al día" desde callbacks y NO provocan render
  const stateRef = useRef(state);
  stateRef.current = state;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const inFlight = useRef<AbortController | null>(null); // la ÚNICA carga en vuelo
  const generation = useRef(0); // sube cada vez que cambian los filtros

  const fetchPage = useCallback(async (cursor: string | null) => {
    if (inFlight.current) return; // ya hay una carga en vuelo: no lanzamos otra
    const controller = new AbortController();
    inFlight.current = controller;
    const myGeneration = generation.current;
    setState(prev => ({ ...prev, status: cursor ? 'loading-more' : 'loading-first', error: null }));

    try {
      const page = await getNewsFeed(filtersRef.current, cursor, LIMIT, controller.signal);
      if (myGeneration !== generation.current) return; // respuesta de filtros viejos: se descarta
      setState(prev => {
        // Regla de Nami: nada se cuenta dos veces. Map por id conserva el orden.
        const byId = new Map(prev.items.map(n => [n.id, n]));
        for (const n of page.items) if (!byId.has(n.id)) byId.set(n.id, n);
        return {
          items: Array.from(byId.values()),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore && page.nextCursor !== null,
          status: 'idle',
          error: null,
        };
      });
    } catch (err) {
      if (isCanceled(err) || myGeneration !== generation.current) return;
      const apiError = toApiError(err);
      // Cursor inválido o de otros filtros: el contrato dice "pedir el feed sin cursor"
      if (apiError.code === 'INVALID_CURSOR' || apiError.code === 'CURSOR_FILTER_MISMATCH') {
        inFlight.current = null;
        setState(initialState);
        void fetchPage(null);
        return;
      }
      // Guardamos el error SIN tocar items: lo ya cargado se queda
      setState(prev => ({ ...prev, status: cursor ? 'error-more' : 'error-first', error: apiError }));
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  // Cambio real de filtros: cancelar lo que esté en vuelo, vaciar y empezar sin cursor
  useEffect(() => {
    generation.current += 1;
    inFlight.current?.abort();
    inFlight.current = null;
    setState(initialState);
    void fetchPage(null);
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [filtersKey, fetchPage]);

  /** Lo llama el sentinel del infinite scroll. Si no corresponde cargar, no hace nada. */
  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (inFlight.current || !s.hasMore || s.status !== 'idle') return;
    void fetchPage(s.nextCursor);
  }, [fetchPage]);

  const retry = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'error-first') void fetchPage(null);
    else if (s.status === 'error-more') void fetchPage(s.nextCursor);
  }, [fetchPage]);

  /** Tras verificar una noticia: actualizarla en la lista, o retirarla si ya no cumple el filtro. */
  const reconcile = useCallback((updated: NewsItem) => {
    setState(prev => {
      if (!prev.items.some(n => n.id === updated.id)) return prev;
      if (matches(updated, filtersRef.current)) {
        return { ...prev, items: prev.items.map(n => (n.id === updated.id ? { ...n, ...updated } : n)) };
      }
      return { ...prev, items: prev.items.filter(n => n.id !== updated.id) };
    });
  }, []);

  return { ...state, loadMore, retry, reconcile };
}
