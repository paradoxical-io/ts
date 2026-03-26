import { DynamoTableName } from '../util';

test('dynamo table name type', () => {
  const name = 'my-table' as DynamoTableName;
  expect(name).toEqual('my-table');
});
