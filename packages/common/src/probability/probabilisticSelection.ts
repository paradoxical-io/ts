import _ from 'lodash';

import { roll } from './percentage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ValueProbability<T extends NonNullable<any>> {
  value: T;
  probability: number;
}

/**
 * Given an array of values with probabilities (decimal value between 0 and 1), selects a value
 * @param probabilities An array of values with that value's associated probability (how often the value should be selected)
 * @param hasher a function to provide how to hash to a space between 0 and 1. Pluggable so you can use
 *        this with the consistent hasher for deterministic hashing based on input data. Default is random
 */
export function probabilisticSelect<T>(probabilities: Array<ValueProbability<T>>, hasher = Math.random): T {
  const probabilitySum = _.sum(probabilities.map(p => p.probability));

  if (probabilitySum !== 1) {
    throw new Error('Probabilities do not sum to 1');
  }

  const rolledValue = roll({ scale: 1, hasher, floor: false });

  let rollingProbabilityValue = 0;
  let selectedValue: T | undefined;

  // Each individual probability is the percent chance of selecting a single value. We only want to randomly roll one time, so we need to
  // cumulatively sum the probabilities until we get a number that is larger than the rolled random value.
  // Essentially, building out a number line from 0-1 with each segment being one of the specific value probabilities. Whichever segment the rolled
  // value lands in is the selected value.
  for (let i = 0; i < probabilities.length; i++) {
    rollingProbabilityValue += probabilities[i].probability;

    if (rollingProbabilityValue > rolledValue) {
      selectedValue = probabilities[i].value;
      break;
    }
  }

  if (selectedValue === undefined) {
    throw new Error('Got an undefined value. This should not be possible if probabilities sum to 1');
  }

  return selectedValue;
}
