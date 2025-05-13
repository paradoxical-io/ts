import { nullOrUndefined } from './nullish';

/**
 * Create compile time tagged types aka haskell style newtypes
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * Create sub brands from brands. For example, a FirstName is a type of Name
 */
export type SubBrand<T, Y> = T extends Brand<unknown, unknown> ? T & { __subBrand: Y } : never;

/**
 * Often times we are mapping data from external sources and then casting to a brand type
 * such that from there on out we have the brand information. However, casting an undefined as a Brand
 * will automatically  make undefined ... a brand. That's not usually w hat you want, you want Brand | undefined
 *
 * This method will safely cast to the brand if the value is defined otherwise return undefined.
 *
 * For example:
 *
 * const name: FirstName | undefined = asBrandSafe(undefined)
 *
 * VS
 *
 * // this is compilable but _not what we intended_
 * const name: Firstname = undefined as Firstname
 *
 * @param value
 */
export function asBrandSafe<B extends Brand<K, unknown>, K>(value: K | undefined | null): B | undefined {
  if (nullOrUndefined(value)) {
    return undefined;
  }

  return value as unknown as B;
}
