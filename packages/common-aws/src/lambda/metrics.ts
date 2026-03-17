import { withNewTrace } from '@paradoxical-io/common-server';
import { Callback, Context } from 'aws-lambda';

import { Logger, Monitoring, noOpMonitoring } from '../monitoring';

type PromiseHandler<TEvent = unknown, TResult = unknown> = (
  event: TEvent,
  context: Context,
  callback: Callback<TResult>
) => Promise<TResult>;

export interface SetupLambdaOptions {
  monitoring?: Monitoring;
  /**
   * Optional close hook for flushing metrics before Lambda returns.
   * Consumers using HttpDDogMetrics pass: () => new Promise(r => metrics.close(r))
   */
  onClose?: () => Promise<void>;
}

/**
 * Register metrics and trace wrapping the handler, this gives our local CLS a new trace ID
 */
export function setupLambda<TEvent, TResult>(
  handler: PromiseHandler<TEvent, TResult>,
  options?: SetupLambdaOptions
): PromiseHandler<TEvent, TResult> {
  const logger: Logger = options?.monitoring?.logger ?? noOpMonitoring().logger;

  return async (...args) =>
    withNewTrace(async () => {
      const result = await handler(...args);

      if (options?.onClose) {
        try {
          await options.onClose();
        } catch (e) {
          logger.warn('Error waiting on metrics close, some metrics may not have flushed properly', e);
        }
      }

      return result;
    });
}
