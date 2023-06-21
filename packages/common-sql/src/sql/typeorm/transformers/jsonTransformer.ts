import { FindOperator } from 'typeorm';

import { ValueTransformer } from './transformers';

export class JsonTransformer<T> implements ValueTransformer<string, T> {
  from(value: string | undefined | null): T | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return JSON.parse(value) as T;
  }

  to(value: T | undefined | null): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    // allow find operators to proceed
    if (value instanceof FindOperator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return value as any;
    }

    return JSON.stringify(value);
  }
}

export class JsonArrayTransformer<T> implements ValueTransformer<string, T[]> {
  /**
   * If the array transformer should be safe on a single, non-array value in the DB.
   *
   * This is useful if the field was changed from a single value to an array of values at some point,
   * to be backwards compatible with the older values.
   */
  readonly nonArraySingleValueSafe: boolean;

  constructor({ nonArraySingleValueSafe = false }) {
    this.nonArraySingleValueSafe = nonArraySingleValueSafe;
  }

  from(value: string | undefined | null): T[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    // The value isn't an array, this is required for the legacy cases where the tag metadata wasn't an array
    if (this.nonArraySingleValueSafe && !value.includes('[')) {
      return [value as unknown as T];
    }

    return JSON.parse(value);
  }

  to(value: T[] | undefined | null): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    // allow find operators to proceed
    if (value instanceof FindOperator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return value as any;
    }

    return JSON.stringify(value);
  }
}
