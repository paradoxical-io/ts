import { currentEnvironment } from '@paradox/common-server';
import { Column, ColumnOptions, ColumnType } from 'typeorm';

const mysqlSqliteTypeMapping: { [key: string]: ColumnType } = {
  mediumtext: 'text',
  timestamp: 'datetime',
  mediumblob: 'blob',
};

export function resolveDbType(mySqlType: ColumnType): ColumnType {
  if (mySqlType.toString() in mysqlSqliteTypeMapping) {
    return mysqlSqliteTypeMapping[mySqlType.toString()];
  }

  return mySqlType;
}

/**
 * Decorator mapping mysql types to sqlite types
 * @param columnOptions
 * @constructor
 */
export function DbAwareColumn(columnOptions: ColumnOptions) {
  if (columnOptions.type && currentEnvironment() === 'local' && process.env.JEST_TEST === 'true') {
    columnOptions.type = resolveDbType(columnOptions.type);
  }

  return Column(columnOptions);
}
