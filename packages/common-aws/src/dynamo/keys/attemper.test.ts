import { asMilli, newTestId, settableTimeProvider } from '@paradox/common';
import { safeExpect } from '@paradox/common-test';
import { CompoundKey, SortKey } from '@paradox/types';

import { AttemptsError, LimitedAttempt, ResetState } from './attempter';
import { InMemoryPartitionedKvTable } from './test/inMemoryKvTable';

test('attempts resets on expired and throws on max attempts', async () => {
  const pkv = new InMemoryPartitionedKvTable();

  const time = settableTimeProvider();

  const config = { attemptsMax: 2, validityTime: asMilli(1, 'hours') };

  const attempter = new LimitedAttempt(pkv, time);

  const key: CompoundKey<string, ResetState> = {
    partition: newTestId(),
    sort: 'password.reset.attempt' as SortKey,
    namespace: 'users',
  };

  // try twice, on the third time we should fail as we've tried too many times
  await attempter.attempt(key, config);
  await attempter.attempt(key, config);

  await safeExpect(attempter.attempt(key, config)).rejects.toThrowError(new AttemptsError('attempts'));

  time.addHours(2);

  // should be ok now since it expired
  await attempter.attempt(key, config);
});

test('clears attempts on success', async () => {
  const pkv = new InMemoryPartitionedKvTable();

  const config = { attemptsMax: 2, validityTime: asMilli(1, 'hours') };

  const time = settableTimeProvider();

  const attempter = new LimitedAttempt(pkv, time);

  const key: CompoundKey<string, ResetState> = {
    partition: newTestId(),
    sort: 'password.reset.attempt' as SortKey,
    namespace: 'users',
  };

  // try twice, on the third time we should fail as we've tried too many times
  await attempter.attempt(key, config);
  const success = await attempter.attempt(key, config);

  await success?.clear();

  // should be ok now since its a new attempt
  await attempter.attempt(key, config);
});
