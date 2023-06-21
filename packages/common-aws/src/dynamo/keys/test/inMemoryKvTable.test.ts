import { newTestId } from '@paradox/common';
import { safeExpect } from '@paradox/common-test';
import { CompoundKey, SortKey } from '@paradox/types';

import { InMemoryPartitionedKvTable } from './inMemoryKvTable';

test('kv set predicates', async () => {
  const kv = new InMemoryPartitionedKvTable();

  const key: CompoundKey<string, string[]> = {
    namespace: 'global',
    sort: 'test' as SortKey,
    partition: newTestId(),
  };

  await kv.addToSet(key, 'foo');
  await kv.addToSet(key, 'bar');

  const result = await kv.get(key);

  safeExpect(result).toEqual(['foo', 'bar']);

  await kv.updateInSet(key, 'x', l => l === 'foo');

  safeExpect((await kv.get(key))?.sort()).toEqual(['x', 'bar'].sort());

  await kv.removeFromSet(key, ['x']);

  safeExpect(await kv.get(key)).toEqual(['bar']);

  await kv.removeFromSetByKey(key, i => i === 'bar');

  safeExpect(await kv.get(key)).toEqual([]);

  // should do nothing
  await kv.removeFromSet(key, ['bar']);

  safeExpect(await kv.get(key)).toEqual([]);
});

test('kv set clears', async () => {
  const kv = new InMemoryPartitionedKvTable();

  const key: CompoundKey<string, string[]> = {
    namespace: 'global',
    sort: 'test' as SortKey,
    partition: newTestId(),
  };

  await kv.addToSet(key, 'foo');
  await kv.addToSet(key, 'bar');

  await kv.clear(key.partition);

  safeExpect(await kv.get(key)).toEqual(undefined);
});
