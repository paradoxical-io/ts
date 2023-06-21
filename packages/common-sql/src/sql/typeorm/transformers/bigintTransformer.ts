import { ValueTransformer } from './transformers';

/**
 * Makes working with bigints easier
 */
export class BigIntTransformer implements ValueTransformer<number | string, number> {
  from(value: Date | number | string | undefined | null): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return Number(value);
  }

  to(value: number | undefined | null): number | string | undefined | null {
    return value;
  }
}
