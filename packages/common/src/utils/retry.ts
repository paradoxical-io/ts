import asyncRetry = require('async-retry');

export class Retrier {
  /**
   * Try a promise ONCE and if it fails kick it into a non awaited retryDecorator mode
   *
   * This allows you to try quickly and then dangle a promise separately outside of the await context to complete
   * @param p
   * @param opts
   * @param onFailure
   * @param onSuccess
   */
  static async tryFast(
    p: () => Promise<void>,
    onFailure: (e: Error | unknown) => void,
    onSuccess?: () => void,
    opts?: asyncRetry.Options
  ): Promise<void> {
    try {
      await p();
    } catch (e) {
      asyncRetry(p, opts)
        .then(() => onSuccess?.())
        .catch(onFailure);
    }
  }
}
