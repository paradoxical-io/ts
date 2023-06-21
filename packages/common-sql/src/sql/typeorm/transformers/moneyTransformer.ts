import { roundDecimals } from '@paradoxical-io/common/dist';
import { FindOperator } from 'typeorm';

import { ValueTransformer } from './transformers';

export class MoneyTransformer implements ValueTransformer<string | number, number> {
  from(value: string | number | undefined | null): number | undefined {
    if (typeof value === 'string') {
      return roundDecimals(Number(value), 4);
    }

    if (value === null || value === undefined) {
      return undefined;
    }

    return value;
  }

  to(value: number | undefined | null): string | number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    /**
     * Support queries like Not(In(...))
     *
     * we need to recursively find the actual value of the query and then apply the transformation
     *
     * Skipping ts checking because this technically breaks the contract of 1:1 mappings
     */
    // @ts-ignore
    if (value instanceof FindOperator) {
      const findValue = value as FindOperator<number>;
      // @ts-ignore
      return new FindOperator<number>(
        findValue[`_type`],
        // don't use .value beacuse typeorm internally unboxes .value to look into the inner find options
        // for example. if you have Not(In([1,2])) then when you do .value you will get the values [1,2]. Instead
        // we want to recursively rebuild the find operators of Not and In and re-map [1,2] to the db statuses
        // @ts-ignore
        this.to(findValue._value),
        findValue.useParameter,
        findValue.multipleParameters
      );
    }
    return roundDecimals(value, 4);
  }
}
