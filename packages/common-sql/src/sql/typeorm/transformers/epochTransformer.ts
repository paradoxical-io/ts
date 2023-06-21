import { bottom, EpochMS } from '@paradoxical-io/types';

import { ValueTransformer } from './transformers';

/**
 * Epoch transformer ensures that any date representable type is forced into an epochMS
 */
export class EpochTransformer implements ValueTransformer<Date | number | string, EpochMS> {
  constructor(private dbType: 'date' | 'string' | 'bigint') {}

  from(value: Date | number | string | undefined | null): EpochMS | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return Number(value) as EpochMS;
    }

    if (typeof value === 'number') {
      return value as EpochMS;
    }

    return value.getTime() as EpochMS;
  }

  to(value: EpochMS | undefined | null): Date | number | string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    switch (this.dbType) {
      case 'date':
        return new Date(value);
      case 'string':
        return value.toString();
      case 'bigint':
        return value;
      default:
        return bottom(this.dbType);
    }
  }
}
