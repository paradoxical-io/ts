import { safeExpect } from '../../../common-test';
import { withCycles } from './deferred';

test('validates unfullfilled cycles', () => {
  safeExpect(() => withCycles(manager => manager.newDeferral('dependency'))).toThrow(/dependency/);
});

test('validates fullfilled cycles', () => {
  const r = withCycles(manager => {
    const d = manager.newDeferral<string>('dependency');
    d.set('value');

    return d.get();
  });

  safeExpect(r).toEqual('value');
});
