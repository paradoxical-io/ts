import _ from 'lodash';

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error(`Expected 'val' to be defined, but received ${val}`);
  }
}

/**
 * Typesafe deep equals
 * @param a
 * @param b
 */
export function isEqual<T>(a: T, b: T): boolean {
  return _.isEqual(a, b);
}
