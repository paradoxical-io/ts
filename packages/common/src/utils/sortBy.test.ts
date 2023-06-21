import { stableEqual } from './sortBy';

test('equates simple objects out of order', () => {
  const a = {
    x: 1,
    y: 1,
  };

  const b = {
    y: 1,
    x: 1,
  };

  expect(stableEqual(a, b)).toBeTruthy();
});

test('does not equate simple objects out of order with the wrong values', () => {
  const a = {
    x: 1,
    y: 1,
  };

  const b = {
    y: 1,
    x: 2,
  };

  expect(stableEqual(a, b)).toBeFalsy();
});

test('equates nested objects out of order with the same values', () => {
  const a = {
    x: 1,
    y: 1,
    z: [
      {
        a: 1,
        b: 2,
      },
    ],
  };

  const b = {
    z: [
      {
        b: 2,
        a: 1,
      },
    ],
    y: 1,
    x: 1,
  };

  expect(stableEqual(a, b)).toBeTruthy();
});
