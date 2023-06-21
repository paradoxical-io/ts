import { safeExpect } from '@paradoxical-io/common-test';
import { Milliseconds } from '@paradoxical-io/types';

import { asMilli } from '../datetime';
import { jitter, sleep, timeout, TimeoutError } from './timeout';

test('jitter', () => {
  for (let i = 0; i < 100; i++) {
    const j = jitter(50 as Milliseconds, 5);
    expect(j).toBeGreaterThanOrEqual(45);
    expect(j).toBeLessThanOrEqual(55);
  }
});

test('times out', async () => {
  const timeoutPromise = () => sleep(20 as Milliseconds);

  await safeExpect(timeout(asMilli(10, 'ms'), timeoutPromise())).rejects.toThrow(new TimeoutError(10 as Milliseconds));
});

test('returns value when not timed out', async () => {
  const validPromise = async () => 'OK';

  safeExpect(await timeout(asMilli(10, 'ms'), validPromise())).toEqual('OK');
});

test('returns original exception if it fails within the timeout', async () => {
  const failed = async () => {
    throw new Error('failed');
  };

  await safeExpect(timeout(asMilli(10, 'ms'), failed())).rejects.toThrow(new Error('failed'));
});
