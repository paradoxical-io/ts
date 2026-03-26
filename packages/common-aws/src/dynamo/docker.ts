import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ConfiguredRetryStrategy } from '@aws-sdk/util-retry';
import { Docker, newDocker } from '@paradoxical-io/common-server/dist/test/docker';

import { DynamoDao } from './mapper';
import { DynamoUtil } from './util';

export class DynamoDocker {
  readonly util: DynamoUtil;

  constructor(public container: Docker, public dynamo: DynamoDBClient) {
    this.util = new DynamoUtil(dynamo);
  }

  async createTable<T extends DynamoDao>(descriptor: new () => T, tableName?: string): Promise<void> {
    return this.util.createTable(descriptor, tableName);
  }

  async removeTable(tableName: string): Promise<void> {
    return this.util.removeTable(tableName);
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
    // added retry logic as there appears to be intermittent timeout errors with dynamodb-local
    retryStrategy: new ConfiguredRetryStrategy(4, (attempt: number) => 100 + attempt * 1000),
  });

  return new DynamoDocker(container, dynamo);
}
