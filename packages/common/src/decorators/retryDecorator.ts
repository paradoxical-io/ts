import asyncRetry = require('async-retry');

/**
 * Managed retry annotation for a method for async methods. Does not work for sync methods
 * and will ignore the retry
 * @param opts Async retry options. To stop retrying early on error use the bailOn callback
 *
 */
export function retry(opts?: asyncRetry.Options & { bailOn?: (e: Error) => boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: object, method: string, descriptor?: TypedPropertyDescriptor<any>) => {
    const className = target.constructor?.name;
    const originalMethod = descriptor!.value;

    const defaults: typeof opts = {
      ...opts,

      // proxy to the on retry
      onRetry: (e, attempt) => {
        opts?.onRetry?.(e, attempt);
      },
    };

    if (originalMethod.constructor.name === 'AsyncFunction') {
      // apply async retries
      // eslint-disable-next-line func-names
      descriptor!.value = async function () {
        // apply the method
        return asyncRetry(async bail => {
          try {
            // eslint-disable-next-line prefer-rest-params
            const result = await originalMethod.apply(this, arguments);

            return result;
          } catch (e) {
            if (e instanceof Error && opts?.bailOn?.(e)) {
              bail(e);
            } else {
              throw e;
            }
          }
        }, defaults);
      };
    } else {
      throw new Error(`Cannot apply retry to a not async method ${className}.${method}`);
    }

    // return edited descriptor as opposed to overwriting the descriptor
    return descriptor;
  };
}
