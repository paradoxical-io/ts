import { NoFunction, notNullOrUndefined, nullOrUndefined } from '@paradox/types';
import _ from 'lodash';

/**
 * Removes the fields from the object that have an undefined value
 *
 * @note This can be useful for areas of code that treat the existence of a key with an undefined value differently than the lack of a key
 * @param o
 * @param includeNull whether to also prune nulls
 */
export function pruneUndefined<T extends object>(o: T, includeNull = false): T {
  if (nullOrUndefined(o) || typeof o !== 'object') {
    return o;
  }

  const copy = { ...o };

  Object.keys(copy).forEach(k => {
    // @ts-ignore
    if (copy[k] === undefined) {
      // @ts-ignore
      delete copy[k];
    }

    // @ts-ignore
    if (includeNull && copy[k] === null) {
      // @ts-ignore
      delete copy[k];
    }
  });

  return copy;
}

/**
 * Transforms all recursive keys in an object to snake_case
 * @param obj
 * @param includeOriginal whether we include an "original_<key>: Key Name" property for each modified field
 */
export function deepToSnake(obj: Record<string, unknown>, includeOriginal: boolean = true): Record<string, unknown> {
  const x: Record<string, unknown> = {};

  Object.keys(obj).forEach(key => {
    const snakedKey = _.snakeCase(key);
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      x[snakedKey] = deepToSnake(obj[key] as Record<string, unknown>, includeOriginal);
    } else {
      x[snakedKey] = obj[key];
      if (includeOriginal && snakedKey !== key) {
        x[`original_${snakedKey}_property`] = key;
      }
    }
  });

  return x;
}

/**
 * Better typesafe way to map on object keys such that the keys are indexable
 * @param o object
 * @param mapper mapper on top of the keys. To get access to values you can index into the original object
 */
export function mapKeys<T extends object, Y>(o: T, mapper: (k: keyof T) => Y) {
  return keysOf(o).map(k => mapper(k));
}

export function keysOf<T extends object>(o: T): Array<keyof T> {
  // @ts-ignore
  return Object.keys(o);
}

/**
 * Out of two values current and previous, applies the mapper and chooses the SET field preferring current over previous
 *
 * This verifies that the new change set is not unsetting immutable previously set values
 *
 * For example, never unset the sending or receiving account ids once they are set, or not making balance undefined/etc
 *
 * @param name
 * @param mapper
 * @param current
 * @param previous
 * @private
 */
export function preferSetField<T, Y>(name: string, mapper: (r: T) => Y, current: T, previous: T | undefined): Y {
  const newValue = mapper(current);
  if (nullOrUndefined(previous)) {
    return newValue;
  }

  const oldValue = mapper(previous);

  if (nullOrUndefined(newValue) && notNullOrUndefined(oldValue)) {
    // Attempting to unset field. Using previous. This is a recoverable error condition but should not happen.

    return oldValue;
  }

  return newValue;
}

/**
 * Stringify safely with typesafety. Prevents stringify nonsensical things like functions
 */
export class SafeJson {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore
  static stringify<T>(value: NoFunction<T>, replacer?: (number | string)[] | null, space?: string | number): string;
  static stringify<T>(
    value: NoFunction<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number
  ): string {
    return JSON.stringify(value, replacer, space);
  }
}
