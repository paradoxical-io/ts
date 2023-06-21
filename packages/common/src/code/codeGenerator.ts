export class CodeGenerator {
  constructor(
    private alphaCars = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    private numericChars = Array.from('0123456789')
  ) {}

  /**
   * Returns an alpha character code like ABCDEF
   * @param size
   */
  alpha<T extends string>(size = 6): T {
    return this.code(size, this.alphaCars) as T;
  }

  /**
   * Returns a numeric character code like 123456
   * @param size
   */
  numeric<T extends string>(size = 6): T {
    return this.code(size, this.numericChars) as T;
  }

  private code(size: number, inputSet: string[]): string {
    const len = inputSet.length;
    let code = '';
    for (let i = 0; i < size; i++) {
      code += inputSet[Math.floor(Math.random() * len)];
    }

    return code;
  }
}
