import { Brand } from './brands';

/**
 * A generic cache key
 */
// value is unused in the interface definition but used for compilation inference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface CacheKey<T> {
  key: string;
  namespace?: string;
}

export type SortKey = Brand<string, 'SortKey'>;

/**
 * A compound key representing a partitioned key value store
 *
 * The second generic is used to infer the resulting type of what the value should be
 */
// value is unused in the interface definition but used for compilation inference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface CompoundKey<PartitionKey extends string, Value = unknown> {
  /**
   * The grouping of the row.  Things like "userId" or "global". All keys for this partition
   * can be queried at once
   */
  partition: PartitionKey;

  /**
   * The data key to store.
   */
  sort: SortKey;

  /**
   * An extra namespace to ensure namespacing of the same sort key from different areas
   */
  namespace: string;
}
