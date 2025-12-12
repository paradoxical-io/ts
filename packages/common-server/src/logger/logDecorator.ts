/* eslint-disable prefer-rest-params,@typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { logMethod as loggingCore, Sampler } from '@paradoxical-io/common';

import { currentEnvironment } from '../env';
import { log } from './log';

/**
 * Automatically logs the method arguments if they are not annotated with @sensitive()
 *
 * @param enableMetrics whether or not to log timing Metrics.instance.  Metrics are _logged_ not sent to datadog
 * @param logResult whether or not to log the result.
 * @param sample Whether to only sample a percentage. Either globally or by environment. To turn logs off
 * by environment set sample value to 0. Range is 0 to 100.  Local env maps to dev.
 */
export function logMethod({
  enableMetrics = true,
  logResult = false,
  sample,
}: {
  enableMetrics?: boolean;
  logResult?: boolean;
  sample?: number | { [k in 'dev' | 'prod']?: number };
} = {}) {
  const sampler: Sampler = {
    percentage: () => {
      if (typeof sample === 'number') {
        return sample;
      }

      const env = currentEnvironment() === 'prod' ? 'prod' : 'dev';
      return sample?.[env];
    },
  };

  return loggingCore({
    enableMetrics,
    logResult,
    sampler,
    logger: log,
  });
}
