import { Brand } from '@paradox/types';
import { SelectQueryBuilder } from 'typeorm';

import { ColumnNames, CrudBase } from '../crudBase';

export type ColumnName = Brand<string, 'ColumnName'>;

/**
 * In order to prevent against sql injection attacks, the functions below require
 * a variable to be used, unless the type is ColumnName or ColumnDerivedValue.
 * This type represents a value that is derived directly from a column (i.e. no user input involved)
 */
export type ColumnDerivedValue = Brand<string, 'ColumnDerivedValue'>;

/** *
 * Converts a clause that converts a datetime to the specified TZ. Note that
 * the tz argument is not sanitized.
 */
export function toLocalTime(colName: ColumnName, tz: string): ColumnDerivedValue {
  return `CONVERT_TZ(${colName}, 'UTC', '${tz}')` as ColumnDerivedValue;
}

/**
 * Returns a clause that converts a date to a string representation of the date in the specified TZ
 */
export function toLocalDayString(colName: ColumnName, tz: string): ColumnDerivedValue {
  return `date_format(${toLocalTime(colName, tz)}, '%Y-%m-%d')` as ColumnDerivedValue;
}

/**
 * Converts the given date column to epoch
 */
export function toEpochMS(colName: string): ColumnDerivedValue {
  // this returns the timestamp in seconds, so multiply
  return `UNIX_TIMESTAMP(${colName}) * 1000` as ColumnDerivedValue;
}

export interface CrudBaseStatic<T extends CrudBase, Y extends keyof T = never> {
  columnNames: ColumnNames<T, Y>;
  new (): T;
}

/**
 * Returns a function that will return the proper column name for a given propertyName.
 * If a table alias is passed, the property name will be prefixed with "<alias>."
 */
export function getColumnNameFunction<T extends CrudBase, Y extends keyof T = never>(
  f: CrudBaseStatic<T, Y>,
  alias?: string
): (propName: keyof T) => ColumnName {
  const prefix = alias ? `${alias}.` : '';
  return (propName: keyof T): ColumnName => {
    const str = propName as string;
    if (str === 'id') {
      return `${prefix}id` as ColumnName;
    }
    if (CrudBase.columns[str]) {
      return (prefix + CrudBase.columns[str]) as ColumnName;
    }
    const cols = f.columnNames as { [key: string]: string };
    if (!cols[str]) {
      throw new Error(`Could not find column name for type ${f.name} and property ${propName.toString()}`);
    }

    return (prefix + cols[str]) as ColumnName;
  };
}

/**
 * Nothing more than a string[].join(' ') provided for readability and sql injection safety.
 * DO NOT USE THIS FOR ANYTHING OTHER THAN COLUMN TO COLUMN COMPARISONS
 * USE andWhere HELPER FOR ANYTHING WITH VARIABLES TO PREVENT SQL INJECTION
 */
export function expr(colName1: ColumnName, operator: string, colName2: ColumnName): string {
  return `${colName1.toString()} ${operator} ${colName2.toString()}`;
}

export function sum(cn: ColumnName | string) {
  return `sum(${cn})`;
}

/**
 * Adds a where clause to the query in a way that prevents against sql injection
 * @param query             The query to which the clause is added
 * @param columnOperand     The column that is part of the comparison
 * @param operator          The operand to apply ('=', '<=', etc.)
 * @param varName           The name of the variable. For example ':userID'. Must start with a colon.
 * @param value             The value for the variable
 */
export function andWhere<T>(
  query: SelectQueryBuilder<T>,
  columnOperand: ColumnName | ColumnDerivedValue,
  operator: '=' | '<' | '<=' | '>' | '>=' | string,
  varName: string,
  value: string | number
): SelectQueryBuilder<T> {
  // force the caller to pass a colon to make it explicit while reading code that the argument is a var name
  if (!varName.startsWith(':')) {
    throw new Error('varName must start with a colon');
  }

  return query.andWhere(`${columnOperand} ${operator} ${varName}`, { [varName.substr(1)]: value });
}
