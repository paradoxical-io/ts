import { Amount } from '@paradoxical-io/common';
import { nullOrUndefined } from '@paradoxical-io/types';

/**
 * Util to get an Amount from a typeorm raw query where the amount's type is `any` or `unknown`.
 *
 * The `queryResult` from `typeorm` should be a number but instead it returns an `any`, so we don't _actually_ know
 * what type it is for sure.
 *
 * The case where it comes back as `null` would mean this gets set to 0, but if it comes back as
 * undefined or something else, we could get a `NaN` here so it's probably safer to just check for that.
 *
 * @param queryResult a amount result we got back from a `typeorm` query
 * @param defaultValue the default value of the query
 * @returns the amount in the `queryResult` or `defaultValue` if the result is a `NaN`
 */
export function safeDbAmount<T extends Amount | undefined = Amount | undefined>(
  queryResult: unknown,
  defaultValue: T
): T {
  // we don't want to fallback to `Number`'s default `null` value because it's 0. We should instead fallback to the `defaultValue`.
  if (nullOrUndefined(queryResult)) {
    return defaultValue;
  }

  // if query result is anything else we can use the `isNaN` check to help out
  const amountResult = Number(queryResult);

  return Number.isNaN(amountResult) ? defaultValue : (amountResult as T);
}
