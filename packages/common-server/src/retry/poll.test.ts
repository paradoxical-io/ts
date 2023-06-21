import { asMilli } from '@paradox/common';
import { safeExpect } from '@paradox/common-test';
import { Milliseconds } from '@paradox/types';

import { exponentialPoll, linearPoll } from './poll';
import { retry } from './retryDecorator';

class Retriable {
  fails = 0;

  @retry({ maxTimeout: 50, minTimeout: 1 })
  async succeedsPromise(failUntil: number): Promise<number | undefined> {
    if (this.fails < failUntil) {
      this.fails++;

      return undefined;
    }

    return failUntil;
  }
}

test('linear poll', async () => {
  const retriable = new Retriable();
  const result = await linearPoll(() => retriable.succeedsPromise(3), 500 as Milliseconds, 10 as Milliseconds);

  safeExpect(result).toEqual({
    type: 'completed',
    data: 3,
  });
});

test('linear poll fails', async () => {
  const retriable = new Retriable();
  const result = await linearPoll(() => retriable.succeedsPromise(3), 5 as Milliseconds, 4 as Milliseconds);

  safeExpect(result).toEqual({
    type: 'timeout',
  });
});

test('exponential poll', async () => {
  const retriable = new Retriable();
  const result = await exponentialPoll(() => retriable.succeedsPromise(3), {
    retries: 5,
    minTimeout: 1,
    maxTimeout: 10,
    expiresAfter: asMilli(100, 'seconds'),
  });

  safeExpect(result).toEqual({
    type: 'completed',
    data: 3,
  });
});

test('exponential poll fails', async () => {
  const retriable = new Retriable();
  const result = await exponentialPoll(() => retriable.succeedsPromise(3), {
    retries: 1,
    minTimeout: 1,
    maxTimeout: 10,
    expiresAfter: asMilli(100, 'seconds'),
  });

  safeExpect(result).toEqual({
    type: 'timeout',
  });
});

test('exponential poll expires', async () => {
  const retriable = new Retriable();
  const result = await exponentialPoll(() => retriable.succeedsPromise(3), {
    retries: 10,
    minTimeout: 9,
    maxTimeout: 100,
    factor: 1,
    expiresAfter: asMilli(10, 'ms'),
  });

  safeExpect(result).toEqual({
    type: 'timeout',
  });
});
