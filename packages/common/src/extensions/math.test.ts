import { safeExpect } from '@paradoxical-io/common-test';

import { randomNumber, sum } from './math';

const fc = require('fast-check');

test('random number integer range', () => {
  fc.assert(
    fc.property(fc.integer(1, 100), fc.integer(100, 1000), (a: number, b: number) => {
      const r = randomNumber(a, b);
      expect(r).toBeGreaterThanOrEqual(a);
      expect(r).toBeLessThanOrEqual(b);
    })
  );
});

test('random number float range', () => {
  fc.assert(
    fc.property(fc.float(0, 0.5), fc.float(0.5, 1), (a: number, b: number) => {
      const r = randomNumber(a, b);
      expect(r).toBeGreaterThanOrEqual(a);
      expect(r).toBeLessThanOrEqual(b);
    })
  );
});

test('sums', () => {
  safeExpect(sum(1, 2)).toEqual(3);
  safeExpect(sum(1, undefined)).toEqual(1);
  safeExpect([1, 2, null, 3, undefined].reduce(sum, 0)).toEqual(6);
});
