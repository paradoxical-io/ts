import { preciseTimeMilli } from '../datetime';

export interface Metrics {
  timing(stat: string, value: number, tags?: Record<string, string>): void;
}

const customMetrics = Symbol('paradoxical:metrics');

interface MetricsProviderMetadata {
  prop: string | symbol;
  method: string | symbol | number;
}

/**
 * Add an annotation on a logger instance in a class to use as the logging instance for all annotation logMethods
 * allows you to capture context in a class and have that context be propagated through annotation logging.
 */
export function metricsProvider(target: Object, prop: string | symbol) {
  return customMetricsProvider<Metrics>('timing')(target, prop);
}

/**
 * A metrics provider that uses a specific method on the metrics instance
 * @param method
 */
export function customMetricsProvider<T extends object>(method: keyof T) {
  return (target: Object, prop: string | symbol) => {
    Reflect.defineMetadata(
      customMetrics,
      {
        method,
        prop,
      } satisfies MetricsProviderMetadata,
      target
    );
  };
}

function resolveMetrics(target: object): Metrics['timing'] | undefined {
  const meta: MetricsProviderMetadata = Reflect.getMetadata(customMetrics, target) ?? {
    prop: 'metrics',
    method: 'timing',
  };

  // @ts-ignore
  const metrics = target?.[meta.prop];

  if (metrics && typeof metrics === 'object' && typeof metrics[meta.method] === 'function') {
    return metrics[meta.method].bind(metrics);
  }

  return undefined;
}

/**
 * Emits a statsd metric timing the method
 * @param stat An optional stat name. If not supplied a default one will be used (prefer default)
 * @param tags Custom set of tags to use. The tag: "name" will always be included which is the class name and method
 * @param metrics Metrics emitter
 */
export function timed({
  stat,
  tags = {},
  metrics,
}: {
  stat?: string;
  tags?: Record<string, string>;
  metrics?: Metrics;
} = {}) {
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

    const warningsByClass = new Set<string>();
    // editing the descriptor/value parameter
    descriptor!.value = function () {
      const resolvedMetrics: Metrics['timing'] | undefined = metrics
        ? metrics['timing'].bind(metrics)
        : resolveMetrics(this);

      const logged = warningsByClass.has(this.constructor.name);
      // only log once
      if (resolvedMetrics === undefined && !process.env.PARADOX_QUIET_TIMING_DECORATORS_EXCEPTIONS && !logged) {
        // eslint-disable-next-line no-console
        console.log(`No metrics instance could be resolved for timed decorator on class ${this.constructor.name}`);
        warningsByClass.add(this.constructor.name);
      }

      const start = preciseTimeMilli();

      const timingResult = () => {
        try {
          resolvedMetrics?.(metricName, preciseTimeMilli() - start, {
            ...tags,
            name: `${target.constructor?.name}.${method}`,
          });
        } catch (e: unknown) {
          if (process.env.PARADOX_QUIET_TIMING_DECORATORS_EXCEPTIONS) {
            // swallow
          } else {
            // eslint-disable-next-line no-console
            console.error('Error emitting timing metric', e);
          }
        }
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
