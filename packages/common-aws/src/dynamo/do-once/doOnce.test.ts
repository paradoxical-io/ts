import { newTestId } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';
import { DoOnceActionKey } from '@paradoxical-io/types';

import { InMemoryPartitionedKvTable } from '../keys';
import { DoOnceManager } from './doOnce';

test('marks done', async () => {
  const { doOnce } = newDoOnce();
  const userId = newTestId();

  const key1 = 'test_key1' as DoOnceActionKey;
  const key2 = 'test_key2' as DoOnceActionKey;

  safeExpect(await doOnce.haveAlreadyDone(userId, key1)).toEqual(undefined);
  safeExpect(await doOnce.haveAlreadyDone(userId, key2)).toEqual(undefined);

  await doOnce.markDone(userId, key1);

  safeExpect(await doOnce.haveAlreadyDone(userId, key1)).toEqual({ done: true, at: expect.any(Number) });
  safeExpect(await doOnce.haveAlreadyDone(userId, key2)).toEqual(undefined);

  safeExpect(await doOnce.haveAlreadyDone(newTestId(), key1)).toEqual(undefined);

  await doOnce.markDone(userId, key2);

  safeExpect(await doOnce.haveAlreadyDone(userId, key1)).toEqual({ done: true, at: expect.any(Number) });
  safeExpect(await doOnce.haveAlreadyDone(userId, key2)).toEqual({ done: true, at: expect.any(Number) });
});

test('does only once', async () => {
  const action = jest.fn(async () => 'act');

  const { doOnce } = newDoOnce();
  const key = 'test_key' as DoOnceActionKey;
  const userId = newTestId();

  const firstTime = await doOnce.doOnce(userId, key, () => action());

  safeExpect(firstTime).toEqual({ didAction: true, actionResponse: 'act', at: expect.any(Number) });

  const done = await doOnce.haveAlreadyDone(userId, key);
  safeExpect(done).toEqual({ done: true, at: expect.any(Number) });

  const secondTime = await doOnce.doOnce(userId, key, () => action());

  safeExpect(secondTime).toEqual({ didAction: false });

  safeExpect(action).toHaveBeenCalledTimes(1);
});

test('clears key if present', async () => {
  const action = jest.fn(async () => 'clear');

  const { doOnce } = newDoOnce();
  const key = 'test_key' as DoOnceActionKey;
  const userId = newTestId();

  await doOnce.doOnce(userId, key, () => action());

  const preDone = await doOnce.haveAlreadyDone(userId, key);
  safeExpect(preDone).toEqual({ done: true, at: expect.any(Number) });

  await doOnce.clearKey(userId, key);

  const postDone = await doOnce.haveAlreadyDone(userId, key);
  safeExpect(postDone).toEqual(undefined);
});

function newDoOnce() {
  const kv = new InMemoryPartitionedKvTable();

  return {
    doOnce: new DoOnceManager(kv),
    kv,
  };
}
