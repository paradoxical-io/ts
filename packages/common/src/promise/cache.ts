import { EpochMS, Milliseconds } from '@paradox/types';

import { defaultTimeProvider } from '../datetime';

/**
 * Lazyily caches a value
 * @param source
 */
export function lazy<T>(source: () => T): () => T {
  let p: T;

  return () => {
    if (p) {
      return p;
    }

    p = source();

    return p;
  };
}

export interface Expiring<T> {
  get(): T;
}

/**
 * Caches and expires a promise
 * @param provider
 * @param ttlMS
 * @param time
 */
export function expiring<T>(provider: () => T, ttlMS: Milliseconds, time = defaultTimeProvider()): Expiring<T> {
  let data: T | undefined;
  let expiresAt: EpochMS | undefined;

  const load = (now: EpochMS) => {
    data = provider();
    expiresAt = (now + ttlMS) as EpochMS;
    return data;
  };

  return {
    get: () => {
      const now = time.epochMS();

      if (!data || !expiresAt) {
        return load(now);
      }

      if (now - expiresAt >= ttlMS) {
        return load(now);
      }

      return data;
    },
  };
}

/**
 * Sets a value once only, ignores all sets once a value is set
 * @param defaultValue
 */
export function setOnce<T>(defaultValue: T): { trySet: (t: T) => boolean; get(): T } {
  let x: T | undefined;

  return {
    trySet(t: T): boolean {
      if (x !== undefined) {
        return false;
      }

      x = t;

      return true;
    },
    get(): T {
      return x ?? defaultValue;
    },
  };
}
