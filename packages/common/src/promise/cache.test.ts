import { Milliseconds } from '@paradoxical-io/types';

import { settableTimeProvider } from '../datetime';
import { expiring, lazy, setOnce } from './cache';

test('lazy caches', () => {
  let x = 0;
  const data = lazy(() => {
    x += 1;
    return x;
  });

  for (let i = 0; i < 10; i++) {
    expect(data()).toEqual(1);
  }
});

test('allows expiration', () => {
  const time = settableTimeProvider();
  let x = 0;
  const data = expiring(
    () => {
      x++;
      return x;
    },
    1 as Milliseconds,
    time
  );

  // check that its cached
  expect(data.get()).toEqual(1);

  expect(data.get()).toEqual(1);

  time.addSeconds(1);

  // should have expired
  expect(data.get()).toEqual(2);
  expect(data.get()).toEqual(2);
});

test('sets once', () => {
  const x = setOnce(1);

  // unset uses default
  expect(x.get()).toEqual(1);

  // can set it once
  expect(x.trySet(2)).toBeTruthy();
  expect(x.get()).toEqual(2);

  // try again and its ignored
  expect(x.trySet(3)).toBeFalsy();
  expect(x.get()).toEqual(2);
});
