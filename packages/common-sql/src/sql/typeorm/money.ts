import { ColumnOptions } from 'typeorm';

import { MoneyTransformer } from './transformers/moneyTransformer';

/**
 * General Accepted Account Principles column types. This lets us store up to $999,999,999.9999
 *
 * in a format that will not suffer from rounding or approximation errors. All money columns should use this
 */
export const GAAP_MONEY_COLUMN_VALUES: ColumnOptions = {
  precision: 13,
  scale: 4,
  type: 'decimal',
  transformer: new MoneyTransformer(),
};
