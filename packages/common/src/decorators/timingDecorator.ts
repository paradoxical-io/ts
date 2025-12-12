import { preciseTimeMilli } from '../datetime';

export interface Metrics {
  timing(stat: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Emits a statsd metric timing the method
 * @param stat An optional stat name. If not supplied a default one will be used (prefer default)
 * @param tags Custom set of tags to use. The tag: "name" will always be included which is the class name and method
 * @param metrics Metrics emitter
 */
export function timed({ stat, tags = {}, metrics }: { stat?: string; tags?: Record<string, string>, metrics: Metrics }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, method: string, descriptor?: TypedPropertyDescriptor<any>) => {
    if (process.env.PARADOX_SKIP_TIMING_DECORATORS) {
      return undefined;
    }

    const metricName = stat ?? 'method.timed';

    // save a reference to the original method this way we keep the values currently in the
    // descriptor and don't overwrite what another decorator might have done to the descriptor.
    if (descriptor === undefined) {
      descriptor = Object.getOwnPropertyDescriptor(target, method);
    }

    const originalMethod = descriptor!.value;

    // editing the descriptor/value parameter
    descriptor!.value = function () {
      const start = preciseTimeMilli();

      const timingResult = () => {
        metrics.timing(metricName, preciseTimeMilli() - start, {
          ...tags,
          name: `${target.constructor?.name}.${method}`,
        });
      };

      // apply the method
      // eslint-disable-next-line prefer-rest-params
      const result = originalMethod.apply(this, arguments);

      // if its a promise, attach a timing listener
      if (result instanceof Promise) {
        return result.finally(timingResult);
      }

      // otherwise its sync, do the timing listener with a try
      try {
        return result;
      } finally {
        timingResult();
      }
    };

    return descriptor;
  };
}
