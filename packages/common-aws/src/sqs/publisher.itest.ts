import { settableTimeProvider } from '@paradoxical-io/common';
import { traceID, withNewTrace } from '@paradoxical-io/common-server';
import { extendJest, safeExpect } from '@paradoxical-io/common-test';
import { Milliseconds, Seconds } from '@paradoxical-io/types';

import { FunctionalConsumer, FunctionalConsumerRaw, MessageProcessorResult } from './consumer';
import { newSqsDocker } from './docker';
import { SQSEvent, SQSPublisher } from './publisher';

extendJest();

test('writes to queue', async () => {
  const docker = await newSqsDocker();

  try {
    const queueURL = await docker.createQueue('write-to-queue');

    const queue = new SQSPublisher<string>(queueURL, docker.sqs);

    const foundData: string[] = [];

    const traces = new Set<string>();

    const handler = async (data: string): Promise<void> => {
      traces.add(traceID().subTrace!);
      foundData.push(data);
    };

    const content = new Array(10).fill('foo').map((d, idx) => d + idx.toString());

    await queue.publish(content);

    const consumer = new FunctionalConsumer(handler, queueURL, {
      longPollWaitTimeSeconds: 1 as Seconds,
      sqs: docker.sqs,
    });

    const queuePromise = consumer.start();

    consumer.stop({ flush: true });

    await queuePromise;

    expect(foundData.sort()).toEqual(content.sort());
    expect(traces.size).toEqual(10);
  } finally {
    await docker.container.close();
  }
});

test('writes to queue raw', async () => {
  const docker = await newSqsDocker();

  try {
    const queueURL = await docker.createQueue('write-to-queue');

    const queue = new SQSPublisher<string>(queueURL, docker.sqs);

    const foundData: string[] = [];

    const handler = async (data: SQSEvent<string>): Promise<void> => {
      foundData.push(data.data);
    };

    const content = new Array(10).fill('foo').map((d, idx) => d + idx.toString());

    await queue.publish(content);

    const consumer = new FunctionalConsumerRaw(handler, queueURL, {
      longPollWaitTimeSeconds: 1 as Seconds,
      sqs: docker.sqs,
    });

    const queuePromise = consumer.start();

    consumer.stop({ flush: true });

    await queuePromise;

    expect(foundData.sort()).toEqual(content.sort());
  } finally {
    await docker.container.close();
  }
});

test('retrys message to queue', async () => {
  const docker = await newSqsDocker();

  try {
    const queueURL = await docker.createQueue('write-to-queue');

    const queue = new SQSPublisher<string>(queueURL, docker.sqs);

    const foundData: Map<string, string[]> = new Map();

    const handler = async (data: string): Promise<MessageProcessorResult> => {
      if (foundData.has(data)) {
        foundData.get(data)!.push(data);
      } else {
        foundData.set(data, [data]);
      }

      if (foundData.get(data)!.length < 3) {
        return { retryInSeconds: 1 as Seconds, type: 'retry-later', reason: 'not done  yet' };
      }

      return undefined;
    };

    const content = new Array(10).fill('foo').map((d, idx) => d + idx.toString());

    await queue.publish(content);

    const consumer = new FunctionalConsumer(handler, queueURL, {
      longPollWaitTimeSeconds: 1 as Seconds,
      sqs: docker.sqs,
    });

    const queuePromise = consumer.start();

    consumer.stop({ flush: true });

    await queuePromise;

    expect(Array.from(foundData.keys()).sort()).toEqual(content.sort());

    // we retried each message 3 times
    expect(Array.from(foundData.values()).flatMap(i => i).length).toEqual(content.length * 3);
  } finally {
    await docker.container.close();
  }
});

test('retrys message via publish later to queue', async () => {
  const docker = await newSqsDocker();

  await withNewTrace(async () => {
    try {
      const queueURL = await docker.createQueue('write-to-queue');

      const queue = new SQSPublisher<string>(queueURL, docker.sqs);

      const foundData: Map<string, string[]> = new Map();

      const handler = async (data: string): Promise<MessageProcessorResult> => {
        if (foundData.has(data)) {
          foundData.get(data)!.push(data);
        } else {
          foundData.set(data, [data]);
        }

        if (foundData.get(data)!.length < 3) {
          return { retryInSeconds: 1 as Seconds, type: 'republish-later', reason: 'not done  yet' };
        }

        return undefined;
      };

      const content = new Array(10).fill('foo').map((d, idx) => d + idx.toString());

      await queue.publish(content);

      const consumer = new FunctionalConsumer(handler, queueURL, {
        longPollWaitTimeSeconds: 1 as Seconds,
        sqs: docker.sqs,
      });

      const queuePromise = consumer.start();

      consumer.stop({ flush: true });

      await queuePromise;

      expect(Array.from(foundData.keys()).sort()).toEqual(content.sort());

      // we retried each message 3 times
      expect(Array.from(foundData.values()).flatMap(i => i).length).toEqual(content.length * 3);
    } finally {
      await docker.container.close();
    }
  });
});

test('retrys message via publish later to queue up to max time', async () => {
  const docker = await newSqsDocker();

  await withNewTrace(async () => {
    try {
      const queueURL = await docker.createQueue('write-to-queue');

      const queue = new SQSPublisher<string>(queueURL, docker.sqs);

      // map of message to each time we got the message
      const foundData: Map<string, string[]> = new Map();

      const handler = async (data: string): Promise<MessageProcessorResult> => {
        if (foundData.has(data)) {
          foundData.get(data)!.push(data);
        } else {
          foundData.set(data, [data]);
        }

        if (foundData.get(data)!.length < 3) {
          return {
            retryInSeconds: 1 as Seconds,
            type: 'republish-later',
            reason: 'not done  yet',
            // basically immediately expires
            expireFromFirstPublishMS: 1 as Milliseconds,
          };
        }

        return undefined;
      };

      const content = new Array(10).fill('foo').map((d, idx) => d + idx.toString());

      await queue.publish(content);

      const consumer = new FunctionalConsumer(handler, queueURL, {
        longPollWaitTimeSeconds: 1 as Seconds,
        sqs: docker.sqs,
      });

      const queuePromise = consumer.start();

      consumer.stop({ flush: true });

      await queuePromise;

      expect(Array.from(foundData.keys()).sort()).toEqual(content.sort());

      // we retried each message 1 time because they auto expired from the first republish time
      // total count is 2 (initial + retry)
      expect(Array.from(foundData.values()).flatMap(i => i).length).toEqual(content.length * 2);
    } finally {
      await docker.container.close();
    }
  });
});

test('kicks message with process after', async () => {
  const docker = await newSqsDocker();

  const time = settableTimeProvider();

  const start = time.epochMS();

  await withNewTrace(async () => {
    try {
      const queueURL = await docker.createQueue('write-to-queue');

      const queue = new SQSPublisher<string>(queueURL, docker.sqs);

      let marked: Date | undefined;
      let handled = 0;
      const handler = async (): Promise<MessageProcessorResult> => {
        handled++;
        marked = new Date();
      };

      const maxVisibilityTimeoutSeconds = 1 as Seconds;

      await queue.publish('now', {
        delay: { type: 'processAfter', epoch: time.addSeconds(3), maxVisibilityTimeoutSeconds },
      });

      time.reset();

      // set the default max viz timeout to 1 second so it should process the message a few times but not actually
      // hand the message off to the consumer until the end
      const consumer = new FunctionalConsumer(handler, queueURL, {
        longPollWaitTimeSeconds: 1 as Seconds,
        sqs: docker.sqs,
        maxVisibilityTimeoutSeconds,
        timeProvider: time,
      });

      const queuePromise = consumer.start();

      // lurch time forward
      setInterval(() => time.addSeconds(1), 1000);

      consumer.stop({ flush: true });

      await queuePromise;

      // assert that we processed the message about 3 seconds later
      expect((marked?.getTime() ?? 0) - start).toBeWithinRange(3400, 2400);

      safeExpect(handled).toEqual(1);
    } finally {
      await docker.container.close();
    }
  });
});
