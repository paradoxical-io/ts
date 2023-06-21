import { safeExpect } from '@paradoxical-io/common-test';
import fc from 'fast-check';

import {
  breakUpWords,
  camelCase,
  leftPad,
  safeSubString,
  splitGroups,
  stripAnsi,
  titleCase,
  truncate,
} from './strings';

test('title case', () => {
  safeExpect(titleCase('foo bar', '')).toEqual('FooBar');
  safeExpect(camelCase('foo bar')).toEqual('fooBar');
  safeExpect(titleCase('')).toEqual('');
  safeExpect(camelCase('')).toEqual('');
  safeExpect(titleCase('f')).toEqual('F');
  safeExpect(camelCase('f')).toEqual('f');
  safeExpect(titleCase('foo bar')).toEqual('Foo Bar');
});

test('left pads', () => {
  fc.assert(
    fc.property(fc.integer(1, 9999999), (a: number) => {
      safeExpect(leftPad(a, 7).length).toEqual(7);
    })
  );

  expect(leftPad(77937, 7)).toEqual('0077937');
  expect(leftPad(2, 2)).toEqual('02');
  expect(leftPad(22, 2)).toEqual('22');
  expect(leftPad(22, 3)).toEqual('022');
});

test('truncates with length', () => {
  expect(truncate('abcde', 3)).toEqual('abc...5');
  expect(truncate('abcde', 4)).toEqual('abcd...5');
  expect(truncate('abcde', 0)).toEqual('...5');
});

test('truncates without length', () => {
  expect(truncate('abcde', 3, false)).toEqual('abc...');
  expect(truncate('abcde', 4, false)).toEqual('abcd...');
  expect(truncate('abcde', 0, false)).toEqual('...');
});

test('does not truncate', () => {
  expect(truncate('abcde', 6)).toEqual('abcde');
  expect(truncate('abcde', 7)).toEqual('abcde');
  expect(truncate('abcde', 5)).toEqual('abcde');
  expect(truncate('', 0)).toEqual('');
});

describe('strip ansi', () => {
  test('strip color from string', () => {
    expect(stripAnsi('\u001B[0m\u001B[4m\u001B[42m\u001B[31mfoo\u001B[39m\u001B[49m\u001B[24mfoo\u001B[0m')).toEqual(
      'foofoo'
    );
  });

  test('strip color from ls command', () => {
    expect(stripAnsi('\u001B[00;38;5;244m\u001B[m\u001B[00;38;5;33mfoo\u001B[0m')).toEqual('foo');
  });

  test('strip reset;setfg;setbg;italics;strike;underline sequence from string', () => {
    expect(stripAnsi('\u001B[0;33;49;3;9;4mbar\u001B[0m')).toEqual('bar');
  });

  test('strip link from terminal link', () => {
    expect(stripAnsi('\u001B]8;;https://github.com\u0007click\u001B]8;;\u0007')).toEqual('click');
  });
});

describe('char count splits', () => {
  test('splits long text into fields no larger than char count', () => {
    const data = `0123456789x`;

    safeExpect(splitGroups(data, 2)).toEqual(['01', '23', '45', '67', '89', 'x']);
  });
});

describe('runes', () => {
  test('handles emojis', () => {
    safeExpect(safeSubString('❤️, 😃', 1)).toEqual('❤️');
    safeExpect(safeSubString('❤️, 😃', 2)).toEqual('❤️,');
    safeExpect(safeSubString('test❤️, 😃', 1)).toEqual('t');
    safeExpect(safeSubString('', 1)).toEqual('');
  });

  test('handles undefined and null even though they arent allowed by the type definition', () => {
    safeExpect(safeSubString('', 1)).toEqual('');
    // @ts-ignore
    safeExpect(safeSubString(null, 1)).toEqual('');
    // @ts-ignore
    safeExpect(safeSubString(undefined, 1)).toEqual('');
  });
});

test('break up words', () => {
  safeExpect(breakUpWords('create a savings goal', 2)).toEqual(['create a', 'savings goal']);
});
