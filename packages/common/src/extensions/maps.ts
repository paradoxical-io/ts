export class Maps {
  static groupBy<Key, Value>(values: Value[], keyProvider: (v: Value) => Key): Map<Key, Value[]> {
    const map = new Map<Key, Value[]>();
    for (const value of values) {
      const key = keyProvider(value);

      if (map.has(key)) {
        map.get(key)!.push(value);
      } else {
        map.set(key, [value]);
      }
    }

    return map;
  }

  /**
   * Convert a map to a key value pair of JSON
   * @param map
   */
  static toObj<K extends string | number | symbol, V>(map: Map<K, V>): { [k in K]: V } {
    const obj = {};
    for (const [key, value] of map) {
      // @ts-ignore
      obj[key] = value;
    }

    return obj as { [k in K]: V };
  }
}
