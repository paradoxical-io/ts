import _, { List } from 'lodash';

/**
 * Fisher yates shuffle
 * @param array
 */
export function shuffleArray<T>(array: T[]): T[] {
  let m = array.length;
  let t;
  let i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    // eslint-disable-next-line no-param-reassign
    array[m] = array[i];
    // eslint-disable-next-line no-param-reassign
    array[i] = t;
  }

  return array;
}

export function randomArrayItem<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

/**
 * Flattens a 2-d array into a 1-d array by columns
 *
 * turns
 *
 * [
 *   [0, 1]
 *   [2, 3
 * ]
 *
 * into [0, 2, 1, 3]
 * @param groups
 */
export function columnFlatten<T>(groups: T[][]): T[] {
  const result: T[] = [];

  const maxCols = _.maxBy(groups, g => g.length)?.length ?? 0;

  for (let col = 0; col < maxCols; col++) {
    for (let row = 0; row < groups.length; row++) {
      if (col < groups[row].length) {
        result.push(groups[row][col]);
      }
    }
  }

  return result;
}

/**
 * typesafe lodash wrapper
 * @param a
 * @param by
 */
export function uniqByKey<T>(a: List<T>, by: keyof T): T[] {
  return _.uniqBy(a, by);
}

export class Arrays {
  static maxBy<T>(data: T[], by: (x: T) => number): T | undefined {
    return _.maxBy(data, by);
  }

  /**
   * Groups an array into subset sizes
   * @param data
   * @param groupSize
   */
  static grouped<T>(data: T[], groupSize: number): T[][] {
    const groups: T[][] = [[]];

    let idx = 0;

    for (const d of data) {
      if (groups[idx].length < groupSize) {
        groups[idx].push(d);
      } else {
        groups.push([]);
        idx++;
        groups[idx].push(d);
      }
    }

    return groups;
  }

  static minBy<T>(data: T[], by: (x: T) => number): T | undefined {
    return _.minBy(data, by);
  }

  static random<T>(data: T[]): T | undefined {
    if (data.length === 0) {
      return undefined;
    }

    return data[Math.floor(Math.random() * data.length)];
  }
}

/**
 * Returns the data interspersed with the intersperor
 * @param data
 * @param intersperor
 * @param interval
 */
export function intersperse<T>(data: T[], intersperor: T, interval: number): T[] {
  const result: T[] = [];

  data.forEach((item, i) => {
    if (i > 0 && i % interval === 0) {
      result.push(intersperor);
    }

    result.push(item);
  });

  return result;
}
