import { ProvidedConfigValue, ValueProvider } from '@paradoxical-io/common-server';

import { Max10, QueueUrl } from './consumer';

export interface SQSConfig {
  queueUrl: QueueUrl;
  maxNumberOfMessages: Max10;
}

export interface ProvidedSqsConfig {
  queueUrl: ProvidedConfigValue;
  maxNumberOfMessages: Max10;
}

export type SQSPublisherConfig = Pick<SQSConfig, 'queueUrl'>;

export type ProvidedSQSPublisherConfig = Pick<ProvidedSqsConfig, 'queueUrl'>;

export async function getSqsConfig(config: ProvidedSqsConfig, provider: ValueProvider): Promise<SQSConfig> {
  return {
    queueUrl: await provider.getValue<QueueUrl>(config.queueUrl),
    maxNumberOfMessages: config.maxNumberOfMessages,
  };
}

export async function getSqsPublisherConfig(
  config: ProvidedSQSPublisherConfig,
  provider: ValueProvider
): Promise<SQSPublisherConfig> {
  return {
    queueUrl: await provider.getValue<QueueUrl>(config.queueUrl),
  };
}
