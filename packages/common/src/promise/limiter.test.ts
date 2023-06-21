import { Milliseconds } from '@paradox/types';
import * as _ from 'lodash';

import { Limiter } from './limiter';
import { sleep } from './timeout';

test('limits', async () => {
  const limit = new Limiter({ maxConcurrent: 5 });

  let active = 0;
  const activePerPromise: number[] = [];
  const promises = new Array(20).fill(0).map(_ =>
    limit.wrap(() => {
      active++;
      const current = active;
      return sleep(100 as Milliseconds).then(() => {
        active--;
        activePerPromise.push(current);
      });
    })
  );

  await Promise.all(promises);

  expect(_.every(activePerPromise, p => p <= 5)).toBeTruthy();
});
