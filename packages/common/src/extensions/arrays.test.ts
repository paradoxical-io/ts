import { safeExpect } from '@paradox/common-test';

import { Arrays, columnFlatten, intersperse } from './arrays';

test('array groups even', () => {
  const splits = Arrays.grouped([1, 2, 3, 4, 5, 6, 7, 8], 2);

  safeExpect(splits).toEqual([
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ]);
});

test('array groups even odd', () => {
  const splits = Arrays.grouped([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);

  safeExpect(splits).toEqual([[1, 2], [3, 4], [5, 6], [7, 8], [9]]);
});

test('array groups empty', () => {
  const splits = Arrays.grouped([], 2);

  safeExpect(splits).toEqual([[]]);
});

describe('random', () => {
  test('empty is undefined', () => {
    safeExpect(Arrays.random([])).toEqual(undefined);
  });

  test('picks each element at some point', () => {
    const set = new Set<number>();

    for (let i = 0; i < 1000; i++) {
      set.add(Arrays.random([1, 2, 3])!);
    }

    safeExpect(Array.from(set).sort()).toEqual([1, 2, 3]);
  });
});

describe('intersperses', () => {
  test('empty', () => {
    safeExpect(intersperse<string>([], ',', 3)).toEqual([]);
  });

  test('less than size', () => {
    safeExpect(intersperse<string>(['a'], ',', 3)).toEqual(['a']);
  });

  test('equal to size', () => {
    safeExpect(intersperse<string>(Array.from('abc'), ',', 3)).toEqual(['a', 'b', 'c']);
  });

  test('greater than size', () => {
    safeExpect(intersperse<string>(Array.from('abcd'), ',', 3)).toEqual(['a', 'b', 'c', ',', 'd']);
  });
});

test('intersperses', () => {
  const data = [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ];

  safeExpect(columnFlatten(data)).toEqual(['a', '1', 'b', '2', 'c', '3']);
});
