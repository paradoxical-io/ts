import { StatsD } from 'hot-shots';

import { isLocal } from '../env';
import { log } from '../logger';
import { MetricEmitter } from './contracts';
import { HttpDDogMetrics } from './datadog';

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// use the http ddog api if we're local and have a key
// otherwise fall back to the statsd option
let defaultMetrics: MetricEmitter =
  (isLocal || process.env.CI) && process.env.DD_API_KEY && !isTest
    ? new HttpDDogMetrics()
    : new StatsD({
        prefix: process.env.METRICS_PREFIX || '',
        errorHandler: () => {},
        mock: isTest,
      });

/**
 * withMetrics sets the global metrics instance
 * @param statsd
 */
export function withMetrics(statsd: MetricEmitter) {
  defaultMetrics = statsd;
}

/**
 * Exposes a promise to shutdown metrics which gracefully flushes all metrics
 */
export async function shutdownMetrics(): Promise<void> {
  return new Promise(resolve => {
    Metrics.instance.increment(globalKeys.shutdown);

    log.info('stopping metrics collector');

    Metrics.instance.close(e => {
      if (e) {
        // eslint-disable-next-line no-console
        console.log('Error shutting down metrics', e);
      }

      resolve();
    });
  });
}

/**
 * useTestMetrics provides a metrics instance that is tooled with a mock buffer
 * @param block
 */
export async function useTestMetrics(block: (m: StatsD) => Promise<void>) {
  const statsD = new StatsD({ mock: true });
  await block(statsD);
  statsD.close(() => {});
}

export const globalKeys = {
  crash: 'app.crash',
  shutdown: 'app.shutdown',
};

export class Metrics {
  static get instance(): MetricEmitter {
    return defaultMetrics;
  }
}
