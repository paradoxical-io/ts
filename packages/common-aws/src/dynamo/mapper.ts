import { DynamoDbTable } from '@aws/dynamodb-data-mapper';

export interface DynamoDao {
  // marker interface for dynamo dao values
}

export function dynamoAssign<T extends DynamoDao>(constructor: new () => T, data: Partial<T>): T {
  return Object.assign(new constructor(), data);
}

export function setDynamoTable<T extends DynamoDao>(constructor: new () => T, tableName: string) {
  // this is a special field that the mapper code uses
  constructor.prototype[DynamoDbTable] = tableName;
}
