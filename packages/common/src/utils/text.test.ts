import { safeExpect } from '@paradoxical-io/common-test';

import {
  Amount,
  AmountFormatOptions,
  emptyToUndefined,
  formatAmount,
  isDigit,
  numericWithCommas,
  onlyAlphaNum,
  onlyDigits,
  safeStringify,
  stripEmoji,
} from './text';

test('only digit filters', () => {
  safeExpect(onlyDigits('12-34-56-abc')).toEqual('123456');
});

test('only alphaNum filters', () => {
  safeExpect(onlyAlphaNum('12-34-56-abcD')).toEqual('123456abcD');
});

test('only alphaNum filters non-printable unicode', () => {
  safeExpect(onlyAlphaNum('12-34-abCD\u00A0F1')).toEqual('1234abCDF1');
});

test('only digits of phone number', () => {
  safeExpect(onlyDigits('+1 (888) 847-2873')).toEqual('18888472873');
});

test.each([
  [4, '4'],
  [40, '40'],
  [400, '400'],
  [4_000, '4,000'],
  [40_000, '40,000'],
  [400_000, '400,000'],
  [4_000_000, '4,000,000'],
])('adds commas for numerics %j = %j', (number, value) => {
  safeExpect(numericWithCommas(number)).toEqual(value);
});

test.each([
  [{ amount: 4 }, '$4.00'],
  [{ amount: 4, includeCentsIfZero: false }, '$4'],
  [{ amount: 4, includeCentsIfZero: true }, '$4.00'],
  [{ amount: 4.25, includeCentsIfZero: false }, '$4.25'],
  [{ amount: 4.25, includeCentsIfZero: true }, '$4.25'],
  [{ amount: 4000, includeCommas: true }, '$4,000.00'],
  [{ amount: 4000, includeCommas: false }, '$4000.00'],
  [{ amount: 400 }, '$400.00'],
  [{ amount: 4000 }, '$4,000.00'],
  [{ amount: 40000 }, '$40,000.00'],
  [{ amount: 400000 }, '$400,000.00'],
  [{ amount: 4000000 }, '$4,000,000.00'],
  [{ amount: 40000000 }, '$40,000,000.00'],
  [{ amount: 10.43, partial: 'dollars' }, '$10'],
  [{ amount: 10.43, partial: 'dollars', includeSignForPositive: true }, '+$10'],
  [{ amount: -10.43, partial: 'dollars' }, '-$10'],
  [{ amount: -10.43, partial: 'dollars', includeSignForNegative: false }, '$10'],
  [{ amount: 10.43, partial: 'cents' }, '.43'],
  [{ amount: 10.0, partial: 'cents', includeCentsIfZero: false }, '.00'],
  [{ amount: 12, includeCentsIfZero: false, includeDollarSign: false }, '12'],
  [{ amount: 12 }, '$12.00'],
  [{ amount: 12, includeDollarSign: false }, '12.00'],
  [{ amount: 12, includeCentsIfZero: false, includeDollarSign: false }, '12'],
  [
    {
      amount: 9997,
      includeCentsIfZero: false,
      includeCommas: true,
      includeDollarSign: true,
      includeSignForNegative: true,
      includeSignForPositive: false,
      partial: undefined,
    },
    '$9,997',
  ],
] as Array<[AmountFormatOptions & { amount: Amount }, string]>)('formatAmount %j = %j', (format, result) => {
  safeExpect(formatAmount(format)).toEqual(result);
});

test('converts empty strings to undefined', () => {
  safeExpect(emptyToUndefined('')).toBeUndefined();
  safeExpect(emptyToUndefined('a')).toEqual('a');
  safeExpect(emptyToUndefined('      a')).toEqual('      a');
  safeExpect(emptyToUndefined('  ')).toBeUndefined();
  safeExpect(emptyToUndefined('\t')).toBeUndefined();
  safeExpect(emptyToUndefined('\n')).toBeUndefined();
});

describe('safe stringify', () => {
  test('circular refs', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const x: any = {};

    x.y = { x };

    safeExpect(safeStringify(x)).toContain('Unable to stringify thrown error!  Converting circular structure to JSON');
  });

  test('redacts sensitive properties', () => {
    safeExpect(safeStringify({ password: 'foo', bar: 'bar' })).toEqual('{"password":"<redacted>","bar":"bar"}');
    safeExpect(safeStringify({ token: 'foo', bar: 'bar' })).toEqual('{"token":"<redacted>","bar":"bar"}');
    safeExpect(safeStringify({ secureToken: 'foo', bar: 'bar' })).toEqual('{"secureToken":"<redacted>","bar":"bar"}');
    safeExpect(safeStringify({ secureToken: '<redactable(foo)>', bar: 'bar' })).toEqual(
      '{"secureToken":"<redactable(foo)>","bar":"bar"}'
    );
    safeExpect(safeStringify({ secureToken: '<redacted(foo)>', bar: 'bar' })).toEqual(
      '{"secureToken":"<redacted(foo)>","bar":"bar"}'
    );
  });

  test('short circuits strings', () => {
    safeExpect(safeStringify('foo')).toEqual(`"foo"`);
  });
});

test.each([
  ['thumbs-up👍 for staying strong💪 without emoji please🙏', 'thumbs-up for staying strong without emoji please'],
  ['👍', ''],
  ['🥲⏱a', 'a'],
] as Array<[string, string]>)('emoji strip %j => %j', (base, stripped) => {
  safeExpect(stripEmoji(base)).toEqual(stripped);
});

describe('digit check', () => {
  test.each(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])('%j is a digit', digit => {
    safeExpect(isDigit(digit)).toEqual(true);
  });

  test('should be false when not single character', () => {
    safeExpect(isDigit('1737890')).toEqual(false);

    safeExpect(isDigit('ahi184')).toEqual(false);
  });

  test('should be false when not a digit', () => {
    safeExpect(isDigit('-')).toEqual(false);

    safeExpect(isDigit('&')).toEqual(false);

    safeExpect(isDigit('a')).toEqual(false);
  });
});
