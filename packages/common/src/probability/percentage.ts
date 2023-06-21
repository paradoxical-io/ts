/**
 * Returns true "percentage" amount of the time
 *
 * @param percentage the threshold to pass. I.e. 90 for '90%'
 * @param scale. Defaults to 100. The scale of what the max is for evaluating
 * @param hasher a function to provide how to hash to a space between 0 and 1. Pluggable so you can use
 *        this with the consistent hasher for deterministic hashing based on input data. Default is random
 * @param floor Whether or not to floor the resulting raw scaled random number
 */
export function chance({
  percentage,
  scale = 100,
  hasher = Math.random,
}: {
  percentage: number;
  scale?: number;
  hasher?: () => number;
}): boolean {
  // special case the always case
  if (percentage === scale) {
    return true;
  }

  // special case the never case
  if (percentage === 0) {
    return false;
  }

  const value = roll({ scale, hasher });
  if (value <= 0) {
    return false;
  }

  return value <= percentage;
}

/**
 * Returns a random roll, scaled to the scale number
 *
 * @param scale. Defaults to 100. The scale of what the max is for evaluating
 * @param hasher a function to provide how to hash to a space between 0 and 1. Pluggable so you can use
 *        this with the consistent hasher for deterministic hashing based on input data. Default is random
 * @param floor Whether or not to floor the resulting raw scaled random number
 */
export function roll({ scale = 100, hasher = Math.random, floor = true }): number {
  const value = hasher() * scale;
  if (floor) {
    return Math.floor(value);
  }

  return value;
}
