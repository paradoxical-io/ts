import { DataMapper } from '@aws/dynamodb-data-mapper';
import { Docker, newDocker } from '@paradox/common-server/dist/test/docker';
import AWS from 'aws-sdk';

import { awsRethrow } from '../errors';
import { DynamoDao, setDynamoTable } from './mapper';

export class DynamoDocker {
  private readonly mapper: DataMapper;

  constructor(public container: Docker, public dynamo: AWS.DynamoDB) {
    this.mapper = new DataMapper({ client: dynamo });
  }

  async createTable<T extends DynamoDao>(descriptor: new () => T, tableName?: string): Promise<void> {
    if (tableName) {
      setDynamoTable(descriptor, tableName);
    }

    await this.mapper
      .ensureTableExists(descriptor, { readCapacityUnits: 1, writeCapacityUnits: 1 })
      .catch(awsRethrow());
  }
}

export async function newDynamoDocker(): Promise<DynamoDocker> {
  const container = await newDocker({
    image: 'amazon/dynamodb-local:1.12.0',
    exposePorts: [8000],
  });

  await container.waitForPort(container.mapping[8000]);

  const base = `http://localhost:${container.mapping[8000]}`;

  const dynamo = new AWS.DynamoDB({
    endpoint: base,
    region: 'us-west-2',
  });

  return new DynamoDocker(container, dynamo);
}
