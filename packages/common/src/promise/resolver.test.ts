import { safeExpect } from '@paradoxical-io/common-test';
import { Brand } from '@paradoxical-io/types';

import { autoResolve } from './resolver';

export type User = Brand<string, 'User'>;

test('auto resolves promises', async () => {
  const p = {
    foo: 1,
    bar: (): Promise<User> | undefined => new Promise<User>(r => r('' as User)),
    biz: {
      baz: () => new Promise<number>(r => r(1)),
    },
  };

  const x = await autoResolve(p);

  safeExpect(x).toMatchObject({
    foo: 1,
    bar: '',
    biz: {
      baz: 1,
    },
  });
});

test('auto resolves promises and respects arrays', async () => {
  const p = {
    arr: [1, 2],
    bar: () => new Promise<string>(r => r('')),
  };

  const x = await autoResolve(p);

  safeExpect(x).toMatchObject({
    arr: [1, 2],
    bar: '',
  });
});
