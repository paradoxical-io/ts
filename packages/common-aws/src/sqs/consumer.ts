import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { defaultTimeProvider, sleep, TimeProvider } from '@paradoxical-io/common';
import { currentEnvironment, isLocal, log, Metrics, signals, withNewTrace } from '@paradoxical-io/common-server';
import { bottom, Brand, EpochMS, Milliseconds, notNullOrUndefined, Seconds } from '@paradoxical-io/types';

import { PartitionedKeyValueTable } from '../dynamo';
import { SQSConfig } from './config';
import { DevProxyProvider, ProxyQueueProvider } from './proxy/proxyProvider';
import { getInvisibilityDelay, SQSEvent } from './publisher';

export type Max10 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 10;

export type QueueName = Brand<string, 'QueueName'>;

export type QueueUrl = Brand<string, 'QueueUrl'>;

export interface Options {
  /**
   * Long poll wait seconds, default is 20 seconds
   */
  longPollWaitTimeSeconds: Seconds;

  /**
   * Max number of messages to get at a time.  Limit is 10
   */
  maxNumberOfMessages: Max10;

  /**
   * The sqs client instance. If not set the default one will be used
   */
  sqs: SQSClient;

  /**
   * If set to true will make a message immediately visible on any unhandled error
   * otherwise messages will time out and re-process at its timeout
   */
  makeAvailableOnError: boolean;

  /**
   * Provider to determine now
   */
  timeProvider: TimeProvider;

  maxVisibilityTimeoutSeconds?: Seconds;

  proxyProvider?: ProxyQueueProvider;
}

interface StopParams {
  timeout?: {
    endTime: number;
  };
  flush?: boolean;
}

/**
 * If a consumer wants to defer a message return this from the consumer
 *
 * Warning: retries do count against instances of delivery, so if you retryDecorator X times and the redrive policy
 * is to DLQ after X deliveries, the message will DLQ
 */
export interface RetryMessageLater {
  type: 'retryDecorator-later';
  reason: string;
  retryInSeconds: Seconds;
}

/**
 * A different version of retryDecorator which re-publishes the original message (potentially with a delay)
 * and ACKS the original message. This means that retrying of messages don't count towards DLQ counts
 */
export interface RepublishMessage {
  type: 'republish-later';
  reason: string;
  /**
   * How long to delay visibility of this message
   */
  retryInSeconds:
    | Seconds
    | {
        type: 'exponential-backoff';
        max: Seconds;
        min: Seconds;
      };

  /**
   * Whether this message should stop being delivered ms time after the _first_ republish
   */
  expireFromFirstPublishMS?: Milliseconds;
}

/**
 * Starts the consumers and safely hooks into the signal shutdown to gracefully stop them
 *
 * The returning promise will not resolve until the consumers are all gracefully stopped
 * @param consumers
 */
export async function runSQS(consumers: Array<SQSConsumer<unknown>>): Promise<void> {
  const consumerPromises = consumers.map(c => c.start());

  // tell the consumer to stop on shutdown
  signals.onShutdown(async () => {
    log.info('Stopping consumers');

    consumers.forEach(consumer => consumer.stop());

    // wait for it to end
    await Promise.all(consumerPromises);
  });

  log.info('Consumers are starting');

  // start consumer until shutdown requested
  await Promise.all(consumerPromises);

  log.info('Consumers are finished');
}

export type MessageProcessorResult = void | RetryMessageLater | RepublishMessage;

export interface MessageProcessor<T> {
  process(data: T): Promise<MessageProcessorResult>;
}

export interface MessageProcessorRaw<T> {
  process(data: SQSEvent<T>): Promise<MessageProcessorResult>;
}

export abstract class SQSConsumer<T> implements MessageProcessor<T> {
  static defaultOptions: Options = {
    longPollWaitTimeSeconds: 20 as Seconds,
    maxNumberOfMessages: 10,
    sqs: new SQSClient(),
    makeAvailableOnError: false,
    timeProvider: defaultTimeProvider(),
  };

  private stopped?: StopParams;

  private readonly opts: Options;

  private readonly sqs: SQSClient;

  private readonly queueName: QueueName;

  private readonly timeProvider: TimeProvider;

  constructor(private queueUrl: QueueUrl, opts?: Partial<Options>) {
    this.opts = { ...SQSConsumer.defaultOptions, ...opts };
    this.sqs = this.opts.sqs;
    this.queueName = queueUrl.split('/').reverse()[0] as QueueName;
    this.timeProvider = this.opts.timeProvider;
  }

  /**
   * Adhoc processes a message of a raw sqs queue (lambda/etc)
   * @param message
   */
  async adhoc(message: Pick<Message, 'Body' | 'ReceiptHandle'>): Promise<void> {
    await this.handleMessage(message);
  }

  /**
   * Implement to handle each instance of a message
   * @param data
   */
  abstract process(data: T): Promise<MessageProcessorResult>;

  /**
   * Start will resolve once stop has been called (or shortly after)
   */
  async start(): Promise<void> {
    return this.receive();
  }

  /**
   * Tells the consumer to stop processing. Will first finish processing
   */
  stop({ timeoutMilli, flush }: { timeoutMilli?: number; flush?: boolean } = {}): void {
    log.info(`Stopping consumer on queue ${this.queueUrl}`);

    this.stopped = {
      flush,
      ...(timeoutMilli ? { timeout: { endTime: new Date().getTime() + timeoutMilli } } : {}),
    };
  }

  protected async handleMessage(message: Pick<Message, 'Body' | 'ReceiptHandle'>): Promise<void> {
    if (!(message.Body && message.ReceiptHandle)) {
      return;
    }

    let traceId: string | undefined;

    try {
      // ensure our generic sqs event shape is used
      const event = JSON.parse(message.Body.toString()) as SQSEvent<T>;

      const tags = {
        queue: this.queueName,

        // whether this message was deferred from a previous republish
        // this is useful to know about since we can slice metrics by original processing
        // or events that were republished
        deferred: ((event.republishContext?.publishCount ?? 0) > 0).toString(),
      };

      // if we can parse the event, capture its trace outside the try block
      // so any unhandled errors can track this
      traceId = event.trace;

      if (!(event && event.data && event.timestamp)) {
        log.error(
          `Received invalid event payload. Missing required SQSEvent<T> fields. Dumping message: ${message.Body.toString()}`
        );
        Metrics.instance.increment('sqs.invalid_payload', tags);
        return;
      }

      // log how long the message was in the queue
      Metrics.instance.timing('sqs.time_in_queue_ms', this.opts.timeProvider.epochMS() - event.timestamp, tags);

      const processingStart = new Date();

      // whether we should ack the message after processing
      let shouldAck = true;

      // process the event in the context of any previous traces
      await withNewTrace(
        async () => {
          try {
            shouldAck = await this.handMessageToConsumer(event, message);
          } catch (e) {
            // log the error to get access to the trace, but re-throw
            log.error('Error processing message in consumer', e);

            throw e;
          } finally {
            log.info('Done processing sqs message');
          }
        },
        traceId,
        { queueName: this.queueName }
      );

      // mark how long it took to process a message
      Metrics.instance.timing(
        'sqs.processing_time_ms',
        this.opts.timeProvider.epochMS() - processingStart.getTime(),
        tags
      );

      if (shouldAck) {
        // ack the message from sqs
        await this.ack(message.ReceiptHandle);
      }
    } catch (err) {
      // resume logging with a trace if we have one, otherwise generate a new one so these log message are all paired together
      await withNewTrace(async () => {
        log.error('Unhandled error processing message', err);

        Metrics.instance.increment('sqs.processing_error');

        if (this.opts.makeAvailableOnError && message.ReceiptHandle) {
          log.debug('Making message immediately available');

          const command = new ChangeMessageVisibilityCommand({
            ReceiptHandle: message.ReceiptHandle,
            QueueUrl: this.queueUrl,
            VisibilityTimeout: 0,
          });

          await this.sqs.send(command);
        }
      }, traceId);
    }
  }

  protected async processRaw(data: SQSEvent<T>): Promise<MessageProcessorResult> {
    return this.process(data.data);
  }

  private async receive(): Promise<void> {
    log.info(`Starting to receive messages on ${this.queueUrl}`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.stopped) {
        // hard stop
        if (!this.stopped.flush) {
          log.info(`Hard stop consumer on queue ${this.queueUrl}`);
          return;
        }
        // timed out
        if (this.stopped.timeout && this.stopped.timeout.endTime >= new Date().getTime()) {
          log.info(`Stop timeout of consumer on queue ${this.queueUrl}`);

          return;
        }
      }

      try {
        // long poll wait for messages
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: this.opts.maxNumberOfMessages,
          WaitTimeSeconds: this.opts.longPollWaitTimeSeconds,
        });

        const result = await this.sqs.send(command);

        if (!result.Messages || result.Messages.length === 0) {
          // done flushing
          if (this.stopped && this.stopped.flush) {
            return;
          }

          // not stopped, try again
          continue;
        }

        await this.proxy(result.Messages);

        // process all messages
        await Promise.all(result.Messages.map(x => this.handleMessage(x)));
      } catch (e) {
        log.error(
          'Error processing batch of messages.  Should not happen since message handling should fail but just not ack!',
          e
        );

        Metrics.instance.increment('sqs.batch_failure', { queue: this.queueUrl });

        // retryDecorator in 1 second to prevent spamming on unknown failures
        await sleep(1000 as Milliseconds);
      }
    }
  }

  private async ack(handle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: handle,
    });

    await this.sqs.send(command);
  }

  private async republishLater(event: SQSEvent<T>, result: RepublishMessage): Promise<boolean> {
    const now = this.timeProvider.epochMS();

    if (
      event.republishContext?.maxPublishExpiration !== undefined &&
      // now is past the expiration
      event.republishContext?.maxPublishExpiration <= now
    ) {
      log.error(
        `Republished message reached expiration, not acking anymore. Expiration ${event.republishContext?.maxPublishExpiration}`
      );
      return false;
    }

    const nextEvent: SQSEvent<T> = {
      ...event,
      timestamp: this.opts.timeProvider.epochMS(),
    };

    if (!nextEvent.republishContext) {
      nextEvent.republishContext = { publishCount: 1 };

      if (notNullOrUndefined(result.expireFromFirstPublishMS)) {
        nextEvent.republishContext.maxPublishExpiration = (result.expireFromFirstPublishMS + now) as EpochMS;

        log.info(
          `Republishing message and setting expiration to time out at ${nextEvent.republishContext.maxPublishExpiration}`
        );
      }
    } else {
      nextEvent.republishContext.publishCount = (nextEvent.republishContext.publishCount ?? 0) + 1;
    }

    const messageBody = JSON.stringify(nextEvent);

    log.info(
      `Requested to retry event later via republish. Making message visible in ~${JSON.stringify(
        result.retryInSeconds
      )} seconds. Reason: ${result.reason}`
    );

    const command = new SendMessageCommand({
      MessageBody: messageBody,
      QueueUrl: this.queueUrl,
      DelaySeconds: determineRetryDelay(result, nextEvent.republishContext.publishCount),
    });

    await this.sqs.send(command);

    return true;
  }

  /**
   * Returns true or false depending on if we should ack the message by handing the message off to the consumer
   * or deferring the message if necessary
   * @param event
   * @param message
   * @private
   */
  private async handMessageToConsumer(event: SQSEvent<T>, message: Message): Promise<boolean> {
    if (event.republishContext?.processAfter && this.timeProvider.epochMS() < event.republishContext.processAfter) {
      log.info(`Message should be processed after ${event.republishContext?.processAfter}, not handling yet`);

      return this.republishLater(event, {
        type: 'republish-later',
        reason: 'Message not ready for processing',
        retryInSeconds: getInvisibilityDelay(
          {
            delay: {
              type: 'processAfter',
              epoch: event.republishContext.processAfter,
              maxVisibilityTimeoutSeconds: this.opts.maxVisibilityTimeoutSeconds,
            },
          },
          this.timeProvider
        ),
      });
    }

    const republishCountLog = event.republishContext?.publishCount
      ? `Current re-publish count: ${event.republishContext?.publishCount}`
      : '';

    log.info(`Starting processing sqs message. ${republishCountLog}`);

    const result = await this.processRaw(event);

    if (result && message.ReceiptHandle) {
      switch (result.type) {
        case 'retryDecorator-later': {
          log.info(
            `Requested to retry event later. Making message visible in ${result.retryInSeconds} seconds. Reason: ${result.reason}`
          );

          const command = new ChangeMessageVisibilityCommand({
            ReceiptHandle: message.ReceiptHandle,
            QueueUrl: this.queueUrl,
            VisibilityTimeout: result.retryInSeconds,
          });

          await this.sqs.send(command);
          return false;
        }

        case 'republish-later':
          return this.republishLater(event, result);
        default:
          return bottom(result, never => {
            log.warn(never);

            // we don't know the type of the result, so give it to the consumer to handle
            return true;
          });
      }
    }

    return true;
  }

  private async proxy(messages: Message[] | undefined) {
    // proxy not allowed in prod or when running local
    if (currentEnvironment() === 'prod' || isLocal) {
      return;
    }

    if (!messages) {
      return;
    }

    const queues = await this.opts?.proxyProvider?.queues(this.queueName);
    if (!queues) {
      return;
    }

    await Promise.all(
      queues.map(async queue => {
        const command = new SendMessageBatchCommand({
          QueueUrl: queue,
          Entries: messages.map((m, idx) => ({ MessageBody: m.Body ?? '', Id: idx.toString() })),
        });

        await this.sqs.send(command);

        log.info(`Proxied ${messages.length} messages to ${queue}`);
      })
    );
  }
}

export function determineRetryDelay(result: RepublishMessage, publishCount: number | undefined): Seconds {
  if (typeof result.retryInSeconds === 'number') {
    return result.retryInSeconds;
  }

  return Math.min(
    result.retryInSeconds.max,
    result.retryInSeconds.min + (notNullOrUndefined(publishCount) && publishCount > 0 ? 2 ** (publishCount ?? 0) : 0)
  ) as Seconds;
}

/**
 * Utility class to create a consumer from a method
 * @param method
 * @param queue
 * @param opts
 */
export class FunctionalConsumer<T> extends SQSConsumer<T> {
  constructor(
    private handler: (data: T) => Promise<MessageProcessorResult>,
    queue: QueueUrl,
    opts: Partial<Options> = {}
  ) {
    super(queue, opts);
  }

  async process(data: T): Promise<MessageProcessorResult> {
    return this.handler(data);
  }
}

export class FunctionalConsumerRaw<T> extends SQSConsumer<T> {
  constructor(
    private handler: (data: SQSEvent<T>) => Promise<MessageProcessorResult>,
    queue: QueueUrl,
    opts: Partial<Options> = {}
  ) {
    super(queue, opts);
  }

  async process(_: T): Promise<MessageProcessorResult> {
    throw new Error('Process raw process function called, this should not happen');
  }

  protected processRaw(data: SQSEvent<T>): Promise<MessageProcessorResult> {
    return this.handler(data);
  }
}

export function newConsumer<T>(method: (event: T) => Promise<MessageProcessorResult>, config: SQSConfig) {
  return new FunctionalConsumer<T>(method, config.queueUrl, {
    maxNumberOfMessages: config.maxNumberOfMessages,
    proxyProvider: currentEnvironment() === 'prod' ? undefined : new DevProxyProvider(new PartitionedKeyValueTable()),
  });
}

export function newRawConsumer<T>(method: (event: SQSEvent<T>) => Promise<MessageProcessorResult>, config: SQSConfig) {
  return new FunctionalConsumerRaw<T>(method, config.queueUrl, {
    maxNumberOfMessages: config.maxNumberOfMessages,
    proxyProvider: currentEnvironment() === 'prod' ? undefined : new DevProxyProvider(new PartitionedKeyValueTable()),
  });
}
