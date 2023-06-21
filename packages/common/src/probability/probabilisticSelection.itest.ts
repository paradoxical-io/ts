import { extendJest, safeExpect } from '@paradoxical-io/common-test';

import { probabilisticSelect, ValueProbability } from './probabilisticSelection';

extendJest();

test('probabilistically selects values', () => {
  const probabilities: ValueProbability<number>[] = [
    { value: 1, probability: 0.5 },
    { value: 2, probability: 0.25 },
    { value: 3, probability: 0.25 },
  ];

  const selections: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const selected = probabilisticSelect(probabilities);
    if (selected === undefined) {
      fail('Should not get an undefined selection');
    }

    selections.push(selected);
  }

  const ones = selections.filter(s => s === 1);
  const twos = selections.filter(s => s === 2);
  const threes = selections.filter(s => s === 3);

  safeExpect(ones.length).toBeWithinRange(450, 550);

  safeExpect(twos.length).toBeWithinRange(200, 300);

  safeExpect(threes.length).toBeWithinRange(200, 300);
});
