import { asSeconds, defaultTimeProvider } from '@paradoxical-io/common';
import { traceID } from '@paradoxical-io/common-server';
import { bottom, EpochMS, notNullOrUndefined, nullOrUndefined, Seconds } from '@paradoxical-io/types';
import AWS from 'aws-sdk';
import { SendMessageBatchRequestEntry } from 'aws-sdk/clients/sqs';
import * as _ from 'lodash';

import { awsRethrow } from '../errors';

export interface SQSEvent<T> {
  timestamp: EpochMS;
  trace?: string;
  data: T;
  republishContext?: {
    /**
     * The total times this message has be been republished
     */
    publishCount?: number;
    /**
     * Stop re-publishing the message after this expiration time
     */
    maxPublishExpiration?: EpochMS;

    /**
     * Always re-publish this message until this epoch occurs. Used to kick
     * messages past the max visibility timeout in SQS
     */
    processAfter?: EpochMS;
  };
}

export interface PublishOptions {
  delay?:
    | {
        /**
         * Publish a message with an invisibility timeout in terms of seconds
         */
        type: 'invisible';
        seconds: Seconds;
      }
    | {
        /**
         * Publish a message not to be processed any earlier than the epoch
         */
        type: 'processAfter';

        epoch: EpochMS;

        /**
         * The max interval to kick the message down the line for.  Left unset will use close to the max SQS timeout
         */
        maxVisibilityTimeoutSeconds?: Seconds;
      };
}

export interface Publisher<T> {
  publish(data: T | T[], opts?: PublishOptions): Promise<void>;
}

export class SQSPublisher<T> implements Publisher<T> {
  constructor(private queueUrl: string, private sqs = new AWS.SQS()) {}

  async publish(data: T | T[], opts?: PublishOptions): Promise<void> {
    if (data instanceof Array) {
      await this.publishBatch(data, opts);
      return;
    }

    if (nullOrUndefined(data)) {
      return;
    }

    const delaySeconds = getInvisibilityDelay(opts);
    const now = new Date();
    await this.sqs
      .sendMessage({
        MessageBody: JSON.stringify(createEvent(now, data, opts)),
        QueueUrl: this.queueUrl,
        DelaySeconds: delaySeconds,
      })
      .promise()
      .catch(awsRethrow());
  }

  private async publishBatch(data: T[], opts?: PublishOptions): Promise<void> {
    const now = new Date();

    const chunks = _.chunk<T>(data.filter(notNullOrUndefined), 10);

    for (const chunk of chunks) {
      const entries = chunk.map(
        (entry, idx) =>
          ({
            MessageBody: JSON.stringify(createEvent<T>(now, entry, opts)),
            Id: idx.toString(),
            DelaySeconds: getInvisibilityDelay(opts),
          } as SendMessageBatchRequestEntry)
      );

      await this.sqs
        .sendMessageBatch({
          Entries: entries,
          QueueUrl: this.queueUrl,
        })
        .promise()
        .catch(awsRethrow());
    }
  }
}

/**
 * Determine the visiblity timeout of a message given its options.
 * @param opts
 * @param timeProvider
 */
export function getInvisibilityDelay(opts: PublishOptions | undefined, timeProvider = defaultTimeProvider()): Seconds {
  if (nullOrUndefined(opts) || nullOrUndefined(opts.delay)) {
    return 0 as Seconds;
  }

  switch (opts.delay.type) {
    case 'invisible':
      return opts.delay.seconds;
    case 'processAfter': {
      // set the initial viz delay to be either 15 min or the time till processing
      const maxVizTimeout = opts?.delay?.maxVisibilityTimeoutSeconds ?? asSeconds(15, 'minutes');

      // sqs max delay publish is 15 minutes
      const timeInSecondsTillProcessing = (opts.delay.epoch - timeProvider.epochMS()) / 1000;

      // if it was calculated in the past send a message now
      if (timeInSecondsTillProcessing < 0) {
        return 0 as Seconds;
      }

      return (Math.min(maxVizTimeout, timeInSecondsTillProcessing) ?? 0) as Seconds;
    }
    default:
      return bottom(opts.delay);
  }
}

/**
 * Creates a unified sqs event type
 * @param timestamp
 * @param data
 * @param opts
 */
export function createEvent<T>(timestamp: Date, data: T, opts: PublishOptions | undefined): SQSEvent<T> {
  const baseMessage: SQSEvent<T> = {
    data,
    timestamp: timestamp.getTime() as EpochMS,
    trace: traceID().trace,
  };

  if (opts?.delay?.type === 'processAfter') {
    baseMessage.republishContext = {
      processAfter: opts.delay.epoch,
    };
  }

  return baseMessage;
}
