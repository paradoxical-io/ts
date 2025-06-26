import { CreateQueueCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Docker, newDocker } from '@paradoxical-io/common-server/dist/test/docker';

import { QueueUrl } from './consumer';

export class SQSDocker {
  constructor(public container: Docker, public sqs: SQSClient, private base: string) {}

  async createQueue(name: string): Promise<QueueUrl> {
    const command = new CreateQueueCommand({
      QueueName: name,
    });

    await this.sqs.send(command);

    return `${this.base}/queue/${name}` as QueueUrl;
  }
}

export async function newSqsDocker(): Promise<SQSDocker> {
  const container = await newDocker({
    image: 'softwaremill/elasticmq-native',
    exposePorts: [9324],
  });

  await container.waitForLogs('=== ElasticMQ server');

  const base = `http://localhost:${container.mapping[9324]}`;

  const sqs = new SQSClient({
    endpoint: base,
    region: 'us-west-2',
  });

  return new SQSDocker(container, sqs, base);
}
