import { extendJest, safeExpect } from '@paradox/common-test';

import { consistentChance, consistentHash, consistentHashExperimentKey } from './consistent';

const fc = require('fast-check');

extendJest();

test('consistently hashes between 0 and 1', () => {
  const data: number[] = [];
  fc.assert(
    fc.property(fc.string(), (text: string) => {
      data.push(consistentHash(text));
      expect(consistentHash(text)).toEqual(consistentHash(text));
      expect(consistentHash(text)).toBeLessThanOrEqual(1);
      expect(consistentHash(text)).toBeGreaterThanOrEqual(0);
    }),
    { numRuns: 1000 }
  );

  // given a bunch of distributed data we expect the hash gives us a semi relative distribution of data across the spectrum from 0 to 1
  const flattened = Array.from(new Set(data.map(i => Math.round(i * 10)))).sort((a, b) => a - b);
  expect(flattened).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('consistently hashes with experiment offsets', async () => {
  const user = 'user';

  safeExpect(consistentHashExperimentKey(user, 'exp1')).not.toEqual(consistentHashExperimentKey(user, 'exp2'));
  safeExpect(consistentHashExperimentKey(user, 'exp1')).toEqual(consistentHashExperimentKey(user, 'exp1'));
});

// This test has the potential to fail in rare cases so skipping for CI purposes.
// The test is worth keeping around though as a quick spot check that things are still working reasonably well.
test.skip('consistently chances between 0 and 1 ', () => {
  const variants = {
    one: 0,
    two: 0,
    three: 0,
  };

  fc.assert(
    fc.property(fc.uuid(), (uuid: string) => {
      if (consistentChance(uuid, 'variant1', 33)) {
        variants.one++;
      } else if (consistentChance(uuid, 'variant2', 33)) {
        variants.two++;
      } else {
        variants.three++;
      }
    }),
    { numRuns: 1000 }
  );

  safeExpect(variants.one).toBeWithinRange(275, 375);
  safeExpect(variants.two).toBeWithinRange(275, 375);
  safeExpect(variants.three).toBeWithinRange(275, 375);
});
