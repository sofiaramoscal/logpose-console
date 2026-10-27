import { useEffect, useState } from 'react';

// Helpers para leer la URL de forma segura: un valor inválido en la URL cae al valor por defecto.

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : '';
}

export function parseEnumWithDefault<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return parseEnum(value, allowed) || fallback;
}

export function parseNonNegativeInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Texto de búsqueda: el backend acepta máximo 80 caracteres. */
export function parseQuery(value: string | null): string {
  return (value ?? '').slice(0, 80);
}

/**
 * Construye URLSearchParams omitiendo valores vacíos o iguales al default,
 * así la URL queda corta y legible: /tropels?species=CHISPA&page=2
 */
export function buildParams(values: Record<string, string | number>, defaults: Record<string, string | number>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value === defaults[key]) continue;
    params.set(key, String(value));
  }
  return params;
}

/** Retrasa un valor: útil para no disparar una request por cada tecla. */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** ¿Dos URLSearchParams tienen los mismos valores (sin importar el orden)? */
export function sameParams(a: URLSearchParams, b: URLSearchParams): boolean {
  const norm = (p: URLSearchParams) => [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('&');
  return norm(a) === norm(b);
}
