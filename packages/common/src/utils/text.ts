import { Amount, Brand } from '@paradoxical-io/types';

import { intersperse } from '../extensions';

const emojiRegexCreator = require('emoji-regex');

const emojiRegex = emojiRegexCreator();

const stringDigits = '0123456789';

export function isDigit(s: string): boolean {
  return s.length === 1 && stringDigits.indexOf(s) >= 0;
}

export function onlyDigits(s: string): string {
  return Array.from(s)
    .filter(x => stringDigits.indexOf(x) >= 0)
    .join('');
}

export function onlyAlphaNum(s: string): string {
  return s.replace(/[^0-9a-z]/gi, '');
}

export function stripEmoji(s: string): string {
  return s.replace(emojiRegex, '');
}

export function emptyToUndefined<T extends string>(str?: T): T | undefined {
  return str?.trim() === '' ? undefined : str;
}

export function toFloat(s: string): number | undefined {
  const result = Number.parseFloat(s);

  if (!Number.isNaN(result)) {
    return result;
  }

  return undefined;
}

export interface AmountFormatOptions {
  includeSignForNegative?: boolean;
  /**
   * If the cents portion is zero whether to include a .00 or not. If set to false
   * will omit the .00 if cents are zero
   */
  includeCentsIfZero?: boolean;
  includeSignForPositive?: boolean;
  includeCommas?: boolean;
  includeDollarSign?: boolean;
  /**
   * If 'dollars', only the full dollar amount with a $ and sign indicator, but with no decimal or cents will be returned
   * If 'cents', only the cents portion of the amount, preceded with a decimal, will be returned
   */
  partial?: 'dollars' | 'cents';
}

/**
 * Adds pretty commas every 3 digits for a number
 * @param n
 */
export function numericWithCommas(n: number): string {
  const result = intersperse(Array.from(n.toString()).reverse(), ',', 3).join('');

  return Array.from(result).reverse().join('');
}

/**
 * Ensures an amoutn is formatted with the proper decimal places requested (0, or 2)
 */
type FormattedAmountString = Brand<string, 'FormattedAmountString'>;

/**
 *
 */
export function formatAmount({
  amount,
  includeSignForNegative = true,
  includeSignForPositive = false,
  includeCentsIfZero = true,
  includeCommas = true,
  includeDollarSign = true,
  partial = undefined,
}: {
  amount: Amount;
} & AmountFormatOptions): string {
  const noCents = Math.floor(amount) === amount;

  // if the user specified partial = 'cents', we always need the cents portion, regardless of other settings
  const decimalPlaces = !includeCentsIfZero && noCents && partial !== 'cents' ? 0 : 2;

  // https://stackoverflow.com/a/14428340
  const decimalFormattedAmount = Math.abs(amount).toFixed(decimalPlaces) as FormattedAmountString;

  const prefix = (() => {
    if (amount < 0 && includeSignForNegative) {
      return '-';
    }

    if (amount > 0 && includeSignForPositive) {
      return '+';
    }

    return '';
  })();

  const dollarSign = includeDollarSign ? '$' : '';

  const formatted =
    prefix + dollarSign + (includeCommas ? formatAmountCommas(decimalFormattedAmount) : decimalFormattedAmount);

  switch (partial) {
    case 'dollars':
      return formatted.split('.')[0];
    case 'cents': {
      // there should always be a decimal, but return .00 just in case
      const index = formatted.indexOf('.');
      return index >= 0 ? formatted.substr(index) : '.00';
    }
    default:
      return formatted;
  }
}

/**
 * Intersperses every 3 characters for currency formatting
 * @param amountAsString
 */
function formatAmountCommas(amountAsString: FormattedAmountString): string {
  const [dollars, cents] = amountAsString.split('.');

  const result = intersperse(Array.from(dollars).reverse(), ',', 3).join('');

  return Array.from(result).reverse().join('') + (cents !== undefined ? `.${cents}` : ``);
}

const redactedKeys = ['password', 'secureToken', 'token'];

/**
 * Tries to stringify the item and returns some information about it
 *
 * If the item is not stringifiable (circular refs etc) will return the data type that it is
 */
export function safeStringify(
  x: unknown,
  replacer?: (this: unknown, key: string, value: unknown) => unknown,
  space?: string | number
): string {
  if (typeof x === 'string') {
    return `"${x}"`;
  }

  let text = '';
  try {
    // auto redact passwords/secure tokens from any stringification if it doesn't already have a replacer and isn't already redacted
    // eslint-disable-next-line ban/ban
    text = JSON.stringify(
      x,
      replacer ??
        ((key, val) => (redactedKeys.includes(key) && !val.toString().startsWith('<redact') ? `<redacted>` : val)),
      space
    );
  } catch (e) {
    text = 'Unable to stringify thrown error!';

    if (e instanceof Error) {
      text += `  ${e.message}, ${e.name}`;
    } else {
      // @ts-ignore
      text += `${typeof x} ${x?.constructor?.name}`.trim();
    }
  }

  return text;
}
