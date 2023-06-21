import { floorDecimals } from './rounding';
import { Amount } from './text';

/**
 * Round to 5 decimal digits (to make things like 0.449999999 caused by floating point precision to be 0.45000), and then floor to two digits
 * because synapse doesn't charge fractional pennies as fees.
 *
 * Using 5 because 3 decimal digits was leading to a $1 desired charge (fee of 0.319796954) to have a 0.32 cent fee instead of 0.31.
 * @param amount
 */
export function amountRound<T extends Amount = Amount>(amount: T): T {
  return floorDecimals(round(amount, 5), 2) as T;
}

export function round<T extends Amount = Amount>(amount: T, significantDigits: number): T {
  // eslint-disable-next-line no-restricted-properties
  const roundingValue = Math.pow(10, significantDigits);
  return (Math.round(amount * roundingValue) / roundingValue) as T;
}
