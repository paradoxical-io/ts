import { HttpDDogMetrics, log, withMetrics, withNewTrace } from '@paradoxical-io/common-server';
import { Callback, Context } from 'aws-lambda';

type PromiseHandler<TEvent = unknown, TResult = unknown> = (
  event: TEvent,
  context: Context,
  callback: Callback<TResult>
) => Promise<TResult>;

/**
 * Register metrics and trace wrapping the handler, this gives our local CLS a new trace ID
 */
export function setupLambda<TEvent, TResult>(
  handler: PromiseHandler<TEvent, TResult>,
  metrics = new HttpDDogMetrics()
): PromiseHandler<TEvent, TResult> {
  return async (...args) => {
    withMetrics(metrics);

    return withNewTrace(async () => {
      const result = await handler(...args);

      await new Promise<void>(r =>
        metrics.close(e => {
          if (e) {
            log.warn('Error waiting on metrics, some metrics may not have flushed properly', e);
          }

          r();
        })
      );

      return result;
    });
  };
}
