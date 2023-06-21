import { chance, deepSort, SafeJson } from '@paradox/common';
import { createHash } from 'crypto';

/**
 * Hashes the value consistently to a space between 0 and 1. Can be used for determining if certain
 * id's have feature flags enabled automatically (for probabilistic rollouts, etc)
 * @param value The value to consistently hash
 * @param offset Whether or not to offset the hash through a number ring
 */
export function consistentHash(value: string, offset = 0): number {
  const buffer = createHash('md5').update(value).digest();

  const hashNum = buffer.readUInt32BE(0);
  const intMax = 2 ** 32;

  // scale the 32 bit md5 hash by the total size of what a 32 bit number could be
  return ((hashNum + offset) % intMax) / intMax;
}

/**
 * Creates a consistent hash of the target value offset by the projection of the key onto a 32 bit space
 *
 * This allows for users who are always mapping to 1% (for example) to not be hit by every single feature.
 *
 * The key allows you to _offset_ the experiment such that each experiment distributes its "early adopters"
 * across the entire space
 * @param value The value to consistently hash
 * @param key The experiment that is under test
 */
export function consistentHashExperimentKey(value: string, key: string): number {
  const buffer = createHash('md5').update(key).digest();

  const hashNum = buffer.readUInt32BE(0);

  return consistentHash(value, hashNum);
}

export function md5(value: string): string {
  return createHash('md5').update(value).digest().toString('hex');
}

/**
 * Creates an md5 hash of a deep sorted value, which  means it will be consistent
 * across even when the json fields are arbitrary order.  This is a matter of logical
 * data md5 and not physical json blob md5
 * @param value
 */
export function consistentMd5(value: unknown): string {
  return md5(SafeJson.stringify(deepSort(value)));
}

/**
 * Using consistent hashing returns if the key, when mapped onto a consistent hash space, hits
 * the probability requested.
 *
 * The same key will always map to the same numeric value.  Do not append or pre-pend anything to the key.
 * The key should be a uniformly distributed piece of data for this work (UUID). If its a UIID + any value
 * you have changed the distribution uniformity.
 *
 * To allow for offsets (i.e. the equivalent of using <userId>.<experiment> use the variant field
 *
 * For more information read {@link consistentHash}
 * @param key The key (userId usually) to map to a percentage
 * @param variant A string identifier that uniquely identifies this variant.  This is used to ensure that users who are always mapping to 1% don't always get every 1% experiment
 * The variant here allows you to _offset_ the number line, such that its still _consistent_, but offset.
 * @param percentage The percentage to allow for chance.  If the key falls into percentage or less, means the chance was a success
 */
export function consistentChance(key: string, variant: string, percentage: number): boolean {
  return chance({ percentage, hasher: () => consistentHashExperimentKey(key, variant), scale: 100 });
}
