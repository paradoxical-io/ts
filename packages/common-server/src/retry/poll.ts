import asyncRetry = require('async-retry');
import { defaultTimeProvider, isExpired, sleep } from '@paradox/common';
import { Milliseconds, notNullOrUndefined } from '@paradox/types';

export type Result<T> =
  | {
      type: 'completed';
      data: T;
    }
  | { type: 'timeout' };

class NoDataError extends Error {}

/**
 * Supports exponential polling backoff
 * @param block
 * @param opts The retry options for exponential backoff along with when the polling expires
 * @param time
 */
export async function exponentialPoll<T>(
  block: () => Promise<T | undefined>,
  opts: Omit<asyncRetry.Options, 'onRetry'> & { expiresAfter: Milliseconds },
  time = defaultTimeProvider()
): Promise<Result<T>> {
  const now = time.epochMS();
  try {
    const result = await asyncRetry(async () => {
      if (isExpired(now, opts.expiresAfter, 'ms', time)) {
        throw new NoDataError();
      }

      const resolved = await block();
      if (notNullOrUndefined(resolved)) {
        return resolved;
      }

      throw new NoDataError();
    }, opts);

    return { data: result, type: 'completed' };
  } catch (e) {
    if (e instanceof NoDataError) {
      return { type: 'timeout' };
    }

    throw e;
  }
}

/**
 * Polls linearly on a schedule
 * @param block
 * @param expiresIn
 * @param waitTime
 * @param time
 */
export async function linearPoll<T>(
  block: () => Promise<T | undefined>,
  expiresIn: Milliseconds,
  waitTime: Milliseconds,
  time = defaultTimeProvider()
): Promise<Result<T>> {
  const now = time.epochMS();

  while (!isExpired(now, expiresIn, 'ms', time)) {
    const result = await block();

    if (result) {
      return { type: 'completed', data: result };
    }

    await sleep(waitTime);
  }

  return { type: 'timeout' };
}
