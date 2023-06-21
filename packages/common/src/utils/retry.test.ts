import { safeExpect } from '@paradox/common-test';
import { Milliseconds } from '@paradox/types';

import { sleep } from '../promise';
import { Retrier } from './retry';

test('retries fast using a dangling promise', async () => {
  let tries = 0;

  await new Promise<void>(resolve =>
    Retrier.tryFast(
      async () => {
        if (tries === 2) {
          return;
        }

        if (tries > 0) {
          await sleep(100 as Milliseconds);
        }

        tries++;

        throw new Error(tries.toString());
      },
      () => {},
      resolve
    )
  );

  safeExpect(tries).toEqual(2);
});

test('retries fast returns on first iteration', async () => {
  let tries = 0;

  await Retrier.tryFast(
    async () => {
      tries++;
    },
    () => {}
  );

  safeExpect(tries).toEqual(1);
});
