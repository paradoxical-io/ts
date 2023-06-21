import { Milliseconds } from '@paradoxical-io/types';

import { randomNumber } from '../extensions';

export function sleep(milli: Milliseconds): Promise<void> {
  return new Promise(r => setTimeout(r, milli));
}

export function jitter(start: number, delta = 50): number {
  return start + randomNumber(-delta, delta);
}

export class TimeoutError extends Error {
  constructor(maxWait: Milliseconds) {
    super(`Promise timed out in ${maxWait} ms`);
  }
}

/**
 * Waits for up to max for the promise to complete or reject, otherwise throws a timeout error
 * @param maxWait
 * @param p
 */
export async function timeout<T>(maxWait: Milliseconds, p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    sleep(maxWait).then(() => {
      throw new TimeoutError(maxWait);
    }),
  ]);
}
