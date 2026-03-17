import { Logger } from './logger';
import { Metrics } from './metrics';

/**
 * No-op logger that delegates error/warn to console for safety.
 *
 * CLAUDE.md: "Prefer failing fast and loudly over silent misbehavior."
 * A developer who forgets to wire monitoring still sees errors via console.
 */
export class NoOpLogger implements Logger {
  info(): void {}

  error(msg: string, error?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(`[common-aws] ${msg}`, error ?? '');
  }

  warn(msg: string, error?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(`[common-aws] ${msg}`, error ?? '');
  }

  debug(): void {}

  with(): Logger {
    return this;
  }
}

export class NoOpMetrics implements Metrics {
  increment(): void {}

  timing(): void {}
}
