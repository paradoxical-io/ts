export interface DynamoDao {
  // marker interface for dynamo dao values
}

export function dynamoAssign<T extends DynamoDao>(constructor: new () => T, data: Partial<T>): T {
  return Object.assign(new constructor(), data);
}
