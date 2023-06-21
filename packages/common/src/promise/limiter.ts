import Bottleneck from 'bottleneck';

class LimiterPromise {
  constructor(private limiter: Limiter) {}

  private p: Promise<void>[] = [];

  private closed = false;

  /**
   * Pushes a promise onto a list to be awaited on
   * @param m
   */
  push(m: () => Promise<void>): void {
    if (this.closed) {
      throw new Error('Limiter promise array is closed');
    }

    this.p.push(this.limiter.wrap(m));
  }

  /**
   * Waits for all pushed promises
   */
  async close(): Promise<void> {
    this.closed = true;

    await Promise.all(this.p);
  }
}

/**
 * Limiter is a safe promise limiter. This ensures that no more than concurrency runs at a time
 */
export class Limiter {
  private readonly limiter: Bottleneck;

  constructor(opts: Bottleneck.ConstructorOptions = { maxConcurrent: 5 }) {
    this.limiter = new Bottleneck(opts);
  }

  /**
   * Wraps a function provider as a promise.  It is used to submit promises to a limiter
   * such that you can provide all the returned promises to Promise.all
   * @param promise
   */
  wrap<T>(promise: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(promise);
  }

  push(): LimiterPromise {
    return new LimiterPromise(this);
  }

  /**
   * Close prevents adding new jobs and waits for all limits to complete
   */
  close(): Promise<void> {
    return this.limiter.stop();
  }
}
