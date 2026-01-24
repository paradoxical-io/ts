import { safeExpect } from '@paradoxical-io/common-test';

import { retry } from './retryDecorator';

class Retriable {
  fails = 0;

  retried = false;

  @retry({ maxTimeout: 50, minTimeout: 1 })
  async succeedsPromise(failUntil: number): Promise<number> {
    if (this.fails < failUntil) {
      this.fails++;

      throw new Error('still failing');
    }

    return failUntil;
  }
}

test('doesnt retryDecorator if method succeeds', async () => {
  const retriable = new Retriable();

  safeExpect(await retriable.succeedsPromise(0)).toEqual(0);
  safeExpect(retriable.fails).toEqual(0);
  safeExpect(retriable.retried).toEqual(false);
});

test('retries if method fails', async () => {
  const retriable = new Retriable();

  safeExpect(await retriable.succeedsPromise(3)).toEqual(3);
  safeExpect(retriable.fails).toEqual(3);
  safeExpect(retriable.retried).toEqual(true);
});
