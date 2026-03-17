/**
 * Slim metrics interface for common-aws consumers.
 *
 * Satisfies common's Metrics interface (used by @timed decorator) as a superset,
 * adding increment support.
 */
export interface Metrics {
  increment(stat: string, tags?: Record<string, string>): void;
  increment(stat: string, value: number, tags?: Record<string, string>): void;
  timing(stat: string, value: number, tags?: Record<string, string>): void;
}
