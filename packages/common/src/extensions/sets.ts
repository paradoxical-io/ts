export class Sets {
  /**
   * Returns the set of values that are in set1 but not set2
   *
   * Set2 may have _more_ items but if the diff is empty it means that every item in set1
   * is also in set2
   * @param set1
   * @param set2
   */
  static diff<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const final = new Set<T>();

    // iterate over the values
    for (const elem of set1) {
      // if the value[i] is not present
      // in otherSet add to the differenceSet
      if (!set2.has(elem)) {
        final.add(elem);
      }
    }

    // returns values of differenceSet
    return final;
  }

  /**
   * Returns the intersection of set1 and set. I.e. all values that are both in set1 and set2 from the
   * perspective of set1
   * @param set1
   * @param set2
   */
  static intersect<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return new Set([...set1].filter(x => set2.has(x)));
  }

  static union<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return new Set([...set1, ...set2]);
  }
}
