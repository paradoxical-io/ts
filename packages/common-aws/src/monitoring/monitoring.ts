import { Logger } from './logger';
import { Metrics } from './metrics';
import { NoOpLogger, NoOpMetrics } from './noop';

export interface Monitoring {
  readonly logger: Logger;
  readonly metrics: Metrics;
}

export function noOpMonitoring(): Monitoring {
  return { logger: new NoOpLogger(), metrics: new NoOpMetrics() };
}
