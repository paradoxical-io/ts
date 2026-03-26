import { getSchema } from '@aws/dynamodb-data-mapper';
import { keysFromSchema } from '@aws/dynamodb-data-marshaller';
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from '@aws-sdk/client-dynamodb';
import { Brand } from '@paradoxical-io/types';

import { DynamoDao } from './mapper';

export type DynamoTableName = Brand<string, 'DynamoTableName'>;

export class DynamoUtil {
  constructor(private readonly dynamo: DynamoDBClient) {}

  async createTable<T extends DynamoDao>(descriptor: new () => T, tableName?: string): Promise<void> {
    const schema = getSchema(descriptor.prototype);
    const { attributes, tableKeys } = keysFromSchema(schema);

    const attributeDefs = Object.keys(attributes).map(name => ({
      AttributeName: name,
      AttributeType: attributes[name],
    }));

    const keySchema = Object.keys(tableKeys).map(name => ({
      AttributeName: name,
      KeyType: tableKeys[name],
    }));

    const command = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: attributeDefs,
      KeySchema: keySchema,
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    });

    const result = await this.dynamo.send(command);

    if (result.TableDescription?.TableStatus !== 'ACTIVE') {
      await waitUntilTableExists({ client: this.dynamo, maxWaitTime: 30 }, { TableName: tableName });
    }
  }

  async removeTable(tableName: string): Promise<void> {
    await this.dynamo.send(new DeleteTableCommand({ TableName: tableName }));
    await waitUntilTableNotExists({ client: this.dynamo, maxWaitTime: 30 }, { TableName: tableName });
  }
}
