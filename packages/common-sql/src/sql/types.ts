/**
 * Unified container to express sql queries that may return a count (useful for queries that support paging)
 */

export interface WithCount<T> {
  result: T;
  count?: number;
}
