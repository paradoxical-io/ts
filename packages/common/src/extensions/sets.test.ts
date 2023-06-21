import { Sets } from './sets';

test('diff', () => {
  const source = new Set([1, 2, 3]);
  const compare = new Set([3, 2]);

  expect(Sets.diff(source, compare)).toEqual(new Set([1]));
});

test('union', () => {
  const a = new Set([1, 2, 3]);
  const b = new Set([2, 5, 6]);

  expect(Sets.union(a, b)).toEqual(new Set([1, 2, 3, 5, 6]));
});

test('intersect', () => {
  const a = new Set([1, 2, 3]);
  const b = new Set([2, 5, 6]);

  expect(Sets.intersect(a, b)).toEqual(new Set([2]));
});

test('empty intersect', () => {
  const a = new Set([1, 2, 3]);
  const b = new Set([4, 5, 6]);

  expect(Sets.intersect(a, b)).toEqual(new Set([]));
});

test('full intersect', () => {
  const a = new Set([1, 2, 3]);
  const b = new Set([1, 2, 3]);

  expect(Sets.intersect(a, b)).toEqual(new Set([1, 2, 3]));
});
