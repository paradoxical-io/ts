import { floorDecimals, roundDecimals } from './rounding';

const fc = require('fast-check');

describe('floorDecimals', () => {
  test('can floor/truncate a decimal to a specific precision', () => {
    expect(floorDecimals(1.159, 2)).toEqual(1.15);
    expect(floorDecimals(0.159, 2)).toEqual(0.15);
    expect(floorDecimals(17.56, 2)).toEqual(17.56);
    expect(floorDecimals(17, 0)).toEqual(17);
    expect(floorDecimals(11.111111, 6)).toEqual(11.111111);
    expect(floorDecimals(12.71, 1)).toEqual(12.7);
    expect(floorDecimals(Number('5.47945205479452e-7'), 4)).toEqual(0);
    expect(() => floorDecimals(1.1, -1)).toThrow('negative number of significant');
    expect(() => floorDecimals(1.1, 12)).toThrow('more than 10');
  });

  test('floors to specific precision', () => {
    fc.assert(
      fc.property(fc.float(), fc.integer(0, 10), (n: number, significantDigits: number) => {
        const r = floorDecimals(n, significantDigits);

        const decimalPortionLength = r.toString().split('.')[1]?.length ?? 0;
        expect(decimalPortionLength).toBeLessThanOrEqual(significantDigits);
      })
    );
  });
});

describe('roundDecimals', () => {
  test('can round a decimal to a specific precision', () => {
    expect(roundDecimals(17.99999, 3)).toEqual(18);
    expect(roundDecimals(1.049, 3)).toEqual(1.049);
    expect(roundDecimals(1.049, 2)).toEqual(1.05);
    expect(roundDecimals(1.049, 10)).toEqual(1.049);
    expect(roundDecimals(Number('5.47945205479452e-7'), 4)).toEqual(0);
    expect(() => roundDecimals(1.1, -1)).toThrow('negative number of significant');
    expect(() => roundDecimals(1.1, 12)).toThrow('more than 10');
  });

  test('rounds to a specific precision', () => {
    fc.assert(
      fc.property(fc.float(), fc.integer(0, 10), (n: number, significantDigits: number) => {
        const r = roundDecimals(n, significantDigits);

        const decimalPortionLength = r.toString().split('.')[1]?.length ?? 0;
        expect(decimalPortionLength).toBeLessThanOrEqual(significantDigits);
      })
    );
  });
});
