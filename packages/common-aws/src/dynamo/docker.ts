import { getSchema } from '@aws/dynamodb-data-mapper';
import { keysFromSchema } from '@aws/dynamodb-data-marshaller';
import { CreateTableCommand, DynamoDBClient, waitUntilTableExists } from '@aws-sdk/client-dynamodb';
import { ConfiguredRetryStrategy } from '@aws-sdk/util-retry';
import { Docker, newDocker } from '@paradoxical-io/common-server/dist/test/docker';

import { DynamoDao } from './mapper';

export class DynamoDocker {
  constructor(public container: Docker, public dynamo: DynamoDBClient) {}

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
}

export async function newDynamoDocker(): Promise<DynamoDocker> {
  const container = await newDocker({
    image: 'amazon/dynamodb-local:latest',
    exposePorts: [8000],
  });

  await container.waitForPort(container.mapping[8000]!);

  const base = `http://localhost:${container.mapping[8000]}`;

  const dynamo = new DynamoDBClient({
    endpoint: base,
    region: 'us-west-2',
    // added retryDecorator logic as there appears to be intermittent timeout errors with dynamodb-local
    retryStrategy: new ConfiguredRetryStrategy(4, (attempt: number) => 100 + attempt * 1000),
  });

  return new DynamoDocker(container, dynamo);
}
