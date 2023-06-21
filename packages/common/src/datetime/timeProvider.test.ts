import { EpochMS } from '@paradox/types';

import { isExpired } from './timeProvider';
import { settableTimeProvider } from './timeProviderTest';

test('expires', () => {
  // 0 should expire in 1 millisecond. it's now 10, it is expired
  expect(isExpired(0 as EpochMS, 1, 'ms', settableTimeProvider(10))).toBeTruthy();

  // 20 should expire in 1 millisecond. it's now 10, it is not expired
  expect(isExpired(20 as EpochMS, 1, 'ms', settableTimeProvider(10))).toBeFalsy();

  // 20 should expire in 1 millisecond. it's now 21, it is expired
  expect(isExpired(20 as EpochMS, 1, 'ms', settableTimeProvider(21))).toBeTruthy();
});
