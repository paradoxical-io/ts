export class Booleans {
  // Consider giving this three states to encode a parse error
  static parse(value: string | null) {
    return value === null ? false : value.toLowerCase() === true.toString();
  }
}
