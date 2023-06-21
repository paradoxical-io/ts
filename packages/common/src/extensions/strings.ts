import { nullOrUndefined } from '@paradox/types';
import runes from 'runes';

/**
 * left pad a number
 * @param num
 * @param size
 * @param paddingChar
 */
export function leftPad(num: number | string, size: number, paddingChar = '0'): string {
  let numString = num.toString();
  while (numString.length < size) {
    numString = paddingChar + numString;
  }
  return numString;
}

/**
 * Truncates the string and appends an ellipsis to make it appear truncated
 * @param str
 * @param maxLength
 * @param includeOriginalLength
 *
 * @note Keep in mind that the actual truncated length can be at most maxLength + 3 + length(str.length)
 */
export function truncate(str: string, maxLength: number, includeOriginalLength = true): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}...${includeOriginalLength ? str.length : ''}` : str;
}

/**
 * Rune aware substring.  Use this for any substrings that might have unicode runes such as emojis
 * @param str
 * @param length
 */
export function safeSubString(str: string, length: number): string {
  // str shouldn't ever be nullish, but on the chance that it is, handle it explicitly
  if (nullOrUndefined(str) || str.length === 0) {
    return '';
  }

  return runes.substr(str, 0, length);
}

/**
 * Taken from https://github.com/chalk/strip-ansi/tree/2b8c961e75760059699373f9a69101065c3ded3a
 *
 * This package doesn't export modules properly for easy ingestion into TS so its just copied here
 * @param data
 */
export function stripAnsi(data: string): string {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|');

  return data.replace(new RegExp(pattern, 'g'), '');
}

export function splitGroups(data: string, maxCharsPerGroup: number): string[] {
  const groups: string[] = [];
  let active = '';
  for (let i = 0; i < data.length; i++) {
    if (active.length < maxCharsPerGroup) {
      active += data[i];
    } else {
      groups.push(active);
      active = data[i];
    }
  }

  if (active.length > 0) {
    groups.push(active);
  }

  return groups;
}

export function camelCase(s: string): string {
  const segment = titleCase(s, '');

  if (segment.length <= 1) {
    return segment.toLowerCase();
  }

  return segment[0].toLowerCase() + segment.slice(1);
}

export function titleCase(s: string, joinStr: string = ' '): string {
  return s
    .split(/_|-|\s+/gi)
    .filter(x => x.trim().length > 0)
    .map(titleWorld)
    .join(joinStr);
}

function titleWorld(s: string) {
  if (s.length === 1) {
    return s.toUpperCase();
  }

  if (s.length === 0) {
    return s;
  }

  return s[0].toUpperCase() + s.slice(1);
}

export function breakUpWords(s: string, maxPerLine: number): string[] {
  const result: string[] = [];
  let segments: string[] = [];
  const words = s.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (i % maxPerLine === 0 && segments.length > 0) {
      result.push(segments.join(' '));
      segments = [];
    }

    segments.push(words[i]);
  }

  result.push(segments.join(' '));

  return result.filter(i => i.length > 0);
}
