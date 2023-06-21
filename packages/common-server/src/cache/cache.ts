import { CacheKey, Milliseconds } from '@paradoxical-io/types';

export interface Cache {
  close(): Promise<void>;

  delete<T>(k: CacheKey<T>): Promise<void>;

  get<T>(k: CacheKey<T>): Promise<T | undefined>;

  increment(k: CacheKey<number>): Promise<number>;

  multiGet<T>(keys: Array<CacheKey<T>>): Promise<Map<CacheKey<T>, T>>;

  set<T>(k: CacheKey<T>, value: T, ttl?: Milliseconds): Promise<void>;
}
