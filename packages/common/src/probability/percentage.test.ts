import { chance } from './percentage';

test.skip('percentages', () => {
  for (let targetPercentage = 0; targetPercentage <= 100; targetPercentage += 2) {
    let itemsHit = 0;

    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      if (chance({ percentage: targetPercentage })) {
        itemsHit++;
      }
    }

    expect(itemsHit / iterations).toBeCloseTo(targetPercentage / 100, 1);
  }
});

test('hits random with custom hasher', () => {
  expect(chance({ percentage: 36, hasher: () => 0.1 })).toBeTruthy();
});

test('misses random with custom hasher', () => {
  expect(chance({ percentage: 36, hasher: () => 0.7 })).toBeFalsy();
});

test('zero is always falsy', () => {
  expect(chance({ percentage: 0, hasher: () => 0 })).toBeFalsy();
});

test('1 is always truthy', () => {
  expect(chance({ percentage: 100, hasher: () => 1 })).toBeTruthy();
});
