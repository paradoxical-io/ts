/**
 * Slim logger interface for common-aws consumers.
 *
 * Satisfies common's Logger interface (used by @logMethod decorator) as a superset,
 * adding the full set of log levels and contextual .with() builder.
 */
export interface Logger {
  info(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, error?: unknown): void;
  warn(msg: string, error?: unknown): void;
  debug(msg: string, context?: Record<string, unknown>): void;
  with(context: Record<string, unknown>): Logger;
}
