import { Sets } from '../extensions';

/**
 * Matches based on a token intersection.
 *
 * @note This function
 *   splits the strings by whitespace, hyphens, or commas
 *   filters out single character tokens
 *   converts to lowercase
 *
 *   and finally checks if the two sets created from that have any intersection
 * @param name1
 * @param name2
 */
export function nameMatchIntersect(name1: string | undefined, name2: string | undefined): boolean {
  const splitNames = (s?: string): string[] => {
    if (s === undefined) {
      return [];
    }

    return s
      .split(/\s|-|,/)
      .filter(s => s.length > 1)
      .map(s => s.toLowerCase());
  };

  const name1Set = new Set(splitNames(name1));
  const name2Set = new Set(splitNames(name2));

  return Sets.intersect(name1Set, name2Set).size > 0;
}
