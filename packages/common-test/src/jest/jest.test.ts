/* eslint-disable @typescript-eslint/no-explicit-any */
import { deepSafeObjectContaining, extendJest, safeExpect, safeObjectContaining } from './index';

extendJest();

test('deep containing', () => {
  safeExpect({ foo: 1, bar: { biz: 2, baz: 3 } }).toMatchObject(
    safeObjectContaining({ foo: 1, bar: safeObjectContaining({ biz: 2 } as any) })
  );
  safeExpect({ foo: 1, bar: { biz: 2, baz: 3 } }).toMatchObject(deepSafeObjectContaining({ foo: 1, bar: { biz: 2 } }));
});

test('excludes keys even if undefined', () => {
  const t: { foo: 'bar' } | undefined = undefined;

  safeExpect(t).toMatchObjectExcluding(undefined, ['foo']);
});

test('snap resolver', () => {
  safeExpect({}).toMatchSnapshot();
});
