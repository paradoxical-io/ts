import { JsonObject } from '@paradoxical-io/types';

export function sortBy<T>(field: keyof T) {
  // @ts-ignore
  return (a: T, b: T): number => (a[field] > b[field]) - (a[field] < b[field]);
}

/**
 * Compares the object using a deep nested sort and checks to see if they are the same
 * @param a
 * @param b
 */
export function stableEqual<T>(a: T, b: T) {
  const orderedA = deepSort(a);
  const orderedB = deepSort(b);

  return JSON.stringify(orderedA) === JSON.stringify(orderedB);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepSort(src: any, comparator?: any): any {
  if (src === null || src === undefined) {
    return src;
  }

  if (Array.isArray(src)) {
    return src.map(item => deepSort(item, comparator));
  }

  if (typeof src === 'object') {
    const out: JsonObject = {};

    Object.keys(src!)
      .sort(comparator || ((a, b) => a.localeCompare(b)))
      .forEach(key => {
        out[key] = deepSort(src[key], comparator);
      });

    return out;
  }

  return src;
}
