import { nullOrUndefined, RandomSeed } from '@paradox/types';
import seedrandom = require('seedrandom');

type RandomGenerator = () => number;

/**
 * Generates a random number
 * @param min
 * @param max
 * @param seed If the seed is an integer will always generate the same random number. If the seed is a function will use the function to generate the random
 */
export function randomNumber(min: number, max: number, seed?: RandomSeed | RandomGenerator) {
  return random(seed) * (max - min) + min;
}

function random(seed?: RandomSeed | RandomGenerator): number {
  if (nullOrUndefined(seed)) {
    return Math.random();
  }

  if (typeof seed === 'function') {
    return seed();
  }

  return seedrandom(seed).quick();
}

/**
 * Generates a streem of random numbers based on the seed
 * @param seed
 */
export function randomGenerator(seed: RandomSeed): RandomGenerator {
  return seedrandom(seed);
}

/**
 * Util method to easily sum in a .reduce. Safely coerces null/undefined to 0 for easy
 * use with DB values
 *
 * For example:
 *
 * [1, 2, null, 3, undefined].reduce(sum, 0) = 6
 *
 * @param a
 * @param b
 */
export function sum(a: number | null | undefined, b: number | undefined | null): number {
  return (a ?? 0) + (b ?? 0);
}
