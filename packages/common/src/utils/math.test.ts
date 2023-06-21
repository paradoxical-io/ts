import { amountRound } from './math';
import { Amount } from './text';

const fc = require('fast-check');

describe('amountRound', () => {
  test('rounds and floors properly', () => {
    expect(amountRound(0.319796954 as Amount)).toEqual(0.31);
    expect(amountRound(11.549999 as Amount)).toEqual(11.55);
    expect(amountRound(11.5498999 as Amount)).toEqual(11.54);
    expect(amountRound(1 as Amount)).toEqual(1);
    expect(amountRound(137455059599.36 as Amount)).toEqual(137455059599.36);
  });

  test('rounds to 2 decimal places', () => {
    fc.assert(
      fc.property(fc.float(), (amount: Amount) => {
        const r = amountRound(amount);
        const decimalPortionLength = r.toString().split('.')[1]?.length ?? 0;
        expect(decimalPortionLength).toBeLessThanOrEqual(2);
      })
    );
  });
});
