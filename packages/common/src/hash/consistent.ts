import { createHash } from 'crypto';

import { SafeJson } from '../extensions/object';
import { deepSort } from '../utils/sortBy';

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
