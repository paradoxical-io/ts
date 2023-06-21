import { Docker, newDocker } from '@paradoxical-io/common-server/dist/test/docker';
import AWS from 'aws-sdk';

import { awsRethrow } from '../errors';
import { QueueUrl } from './consumer';

export class SQSDocker {
  constructor(public container: Docker, public sqs: AWS.SQS, private base: string) {}

  async createQueue(name: string): Promise<QueueUrl> {
    await this.sqs
      .createQueue({
        QueueName: name,
      })
      .promise()
      .catch(awsRethrow());

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

  const sqs = new AWS.SQS({
    endpoint: base,
    region: 'us-west-2',
  });

  return new SQSDocker(container, sqs, base);
}
