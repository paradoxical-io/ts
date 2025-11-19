# SQS Module

A robust, type-safe AWS SQS wrapper that provides simplified publishing and consuming of messages with advanced features like retry strategies, message deferral, distributed tracing, and exponential backoff.

## Features

- **Type-Safe Message Handling**: Strongly typed publishers and consumers for compile-time safety
- **Advanced Retry Strategies**: Support for immediate retry, deferred republishing, and exponential backoff
- **Message Deferral**: Schedule messages to be processed at specific times, even beyond SQS's 15-minute delay limit
- **Distributed Tracing**: Automatic trace ID propagation across message lifecycle
- **Graceful Shutdown**: Proper signal handling for clean consumer shutdowns
- **Batch Publishing**: Efficient batch message publishing with automatic chunking
- **Metrics & Monitoring**: Built-in metrics for queue time, processing time, and error rates
- **Development Proxy**: Message proxying for non-production environments
- **Long Polling**: Configurable long-polling for efficient message retrieval

## Installation

This module is part of `@paradoxical-io/common-aws`. Install it with:

```bash
npm install @paradoxical-io/common-aws
```

## Usage

### Publishing Messages

#### Basic Publishing

```typescript
import { SQSPublisher, QueueUrl } from '@paradoxical-io/common-aws/sqs';

interface UserEvent {
  userId: string;
  action: string;
}

// Create a publisher
const publisher = new SQSPublisher<UserEvent>(
  'https://sqs.us-west-2.amazonaws.com/123456789/my-queue' as QueueUrl
);

// Publish a single message
await publisher.publish({
  userId: 'user-123',
  action: 'login'
});

// Publish multiple messages (automatically batched in chunks of 10)
await publisher.publish([
  { userId: 'user-123', action: 'login' },
  { userId: 'user-456', action: 'logout' }
]);
```

#### Publishing with Delay

```typescript
import { Seconds } from '@paradoxical-io/types';

// Delay message visibility by 30 seconds
await publisher.publish(
  { userId: 'user-123', action: 'process' },
  {
    delay: {
      type: 'invisible',
      seconds: 30 as Seconds
    }
  }
);
```

#### Publishing for Future Processing

Schedule messages to be processed at a specific time, even beyond SQS's 15-minute limit:

```typescript
import { EpochMS } from '@paradoxical-io/types';

const processAt = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 days from now

await publisher.publish(
  { userId: 'user-123', action: 'reminder' },
  {
    delay: {
      type: 'processAfter',
      epoch: processAt as EpochMS
    }
  }
);
```

### Consuming Messages

#### Class-Based Consumer

```typescript
import { SQSConsumer, QueueUrl, MessageProcessorResult } from '@paradoxical-io/common-aws/sqs';
import { Seconds } from '@paradoxical-io/types';

interface OrderEvent {
  orderId: string;
  amount: number;
}

class OrderProcessor extends SQSConsumer<OrderEvent> {
  constructor() {
    super('https://sqs.us-west-2.amazonaws.com/123456789/orders' as QueueUrl, {
      maxNumberOfMessages: 5,
      longPollWaitTimeSeconds: 20 as Seconds
    });
  }

  async process(data: OrderEvent): Promise<MessageProcessorResult> {
    try {
      await this.processOrder(data);
      // Returning void acknowledges the message
    } catch (error) {
      if (error.isRetryable) {
        // Retry after 60 seconds
        return {
          type: 'retry-later',
          reason: 'Database temporarily unavailable',
          retryInSeconds: 60 as Seconds
        };
      }
      throw error; // Non-retryable errors let the message go to DLQ
    }
  }

  private async processOrder(data: OrderEvent): Promise<void> {
    // Your business logic here
    console.log(`Processing order ${data.orderId}`);
  }
}

// Start the consumer
const consumer = new OrderProcessor();
await consumer.start();
```

#### Functional Consumer

```typescript
import { newConsumer, SQSConfig } from '@paradoxical-io/common-aws/sqs';

const config: SQSConfig = {
  queueUrl: 'https://sqs.us-west-2.amazonaws.com/123456789/orders' as QueueUrl,
  maxNumberOfMessages: 10
};

const consumer = newConsumer<OrderEvent>(async (event) => {
  console.log('Processing:', event);
  // Returning void acknowledges the message
}, config);

await consumer.start();
```

### Retry Strategies

#### Simple Retry with Delay

Changes message visibility to retry later. Counts against DLQ delivery attempts:

```typescript
async process(data: OrderEvent): Promise<MessageProcessorResult> {
  if (shouldRetry) {
    return {
      type: 'retry-later',
      reason: 'Temporary service unavailable',
      retryInSeconds: 30 as Seconds
    };
  }
}
```

#### Republish with Fixed Delay

Republishes the message with a delay and ACKs the original. Does NOT count against DLQ:

```typescript
async process(data: OrderEvent): Promise<MessageProcessorResult> {
  return {
    type: 'republish-later',
    reason: 'Rate limit reached',
    retryInSeconds: 300 as Seconds
  };
}
```

#### Republish with Exponential Backoff

```typescript
async process(data: OrderEvent): Promise<MessageProcessorResult> {
  return {
    type: 'republish-later',
    reason: 'Service degraded',
    retryInSeconds: {
      type: 'exponential-backoff',
      min: 1 as Seconds,
      max: 300 as Seconds
    }
  };
}
```

The retry delay will be calculated as: `min + 2^(publishCount)`

Examples:
- 1st retry: 1 + 2^1 = 3 seconds
- 2nd retry: 1 + 2^2 = 5 seconds
- 3rd retry: 1 + 2^3 = 9 seconds
- 4th retry: 1 + 2^4 = 17 seconds
- Capped at max (300 seconds)

#### Message Expiration

Stop retrying after a certain time from first publish:

```typescript
import { Milliseconds } from '@paradoxical-io/types';

async process(data: OrderEvent): Promise<MessageProcessorResult> {
  return {
    type: 'republish-later',
    reason: 'Waiting for external service',
    retryInSeconds: 60 as Seconds,
    expireFromFirstPublishMS: (5 * 60 * 1000) as Milliseconds // 5 minutes total
  };
}
```

### Running Multiple Consumers

```typescript
import { runSQS } from '@paradoxical-io/common-aws/sqs';

const consumer1 = new OrderProcessor();
const consumer2 = new NotificationProcessor();

// Starts all consumers and handles graceful shutdown
await runSQS([consumer1, consumer2]);
```

The `runSQS` function:
- Starts all consumers concurrently
- Registers shutdown signal handlers (SIGTERM, SIGINT)
- Ensures graceful shutdown with proper cleanup
- Waits for all consumers to finish processing

### Ad-hoc Message Processing

Process messages outside of the standard consumer loop (useful for Lambda functions):

```typescript
import { Message } from '@aws-sdk/client-sqs';

const consumer = new OrderProcessor();

// Lambda handler example
export const handler = async (event: { Records: Message[] }) => {
  for (const record of event.Records) {
    await consumer.adhoc(record);
  }
};
```

### Configuration with Value Providers

Use configuration providers for dynamic queue URLs:

```typescript
import { getSqsConfig, ProvidedSqsConfig } from '@paradoxical-io/common-aws/sqs';
import { ValueProvider } from '@paradoxical-io/common-server';

const config: ProvidedSqsConfig = {
  queueUrl: { type: 'env', key: 'ORDER_QUEUE_URL' },
  maxNumberOfMessages: 10
};

const valueProvider: ValueProvider = /* your provider */;
const sqsConfig = await getSqsConfig(config, valueProvider);

const consumer = newConsumer<OrderEvent>(processOrder, sqsConfig);
```

### Testing with Docker

Use ElasticMQ for local testing:

```typescript
import { newSqsDocker } from '@paradoxical-io/common-aws/sqs';

const docker = await newSqsDocker();
const queueUrl = await docker.createQueue('test-queue');

const publisher = new SQSPublisher(queueUrl, docker.sqs);
await publisher.publish({ test: 'data' });

// Cleanup
await docker.container.stop();
```

## API Reference

### SQSPublisher<T>

Main class for publishing messages to SQS.

**Constructor:**
```typescript
new SQSPublisher<T>(queueUrl: string, sqs?: SQSClient)
```

**Methods:**
- `publish(data: T | T[], opts?: PublishOptions): Promise<void>` - Publish one or more messages

### SQSConsumer<T>

Abstract base class for consuming messages.

**Constructor:**
```typescript
new SQSConsumer<T>(queueUrl: QueueUrl, opts?: Partial<Options>)
```

**Abstract Methods:**
- `process(data: T): Promise<MessageProcessorResult>` - Implement to handle messages

**Methods:**
- `start(): Promise<void>` - Start consuming messages
- `stop(opts?: { timeoutMilli?: number; flush?: boolean }): void` - Stop the consumer
- `adhoc(message: Message): Promise<void>` - Process a single message ad-hoc

**Options:**
```typescript
interface Options {
  longPollWaitTimeSeconds: Seconds;      // Default: 20
  maxNumberOfMessages: Max10;            // Default: 10
  sqs: SQSClient;                        // Default: new SQSClient()
  makeAvailableOnError: boolean;         // Default: false
  timeProvider: TimeProvider;            // Default: defaultTimeProvider()
  maxVisibilityTimeoutSeconds?: Seconds; // Optional
  proxyProvider?: ProxyQueueProvider;    // Optional
}
```

### Helper Functions

- `newConsumer<T>(method, config)` - Create a functional consumer
- `newRawConsumer<T>(method, config)` - Create a consumer with access to full SQSEvent
- `runSQS(consumers)` - Run multiple consumers with graceful shutdown
- `getSqsConfig(config, provider)` - Resolve configuration using value provider
- `getSqsPublisherConfig(config, provider)` - Resolve publisher configuration

### Types

```typescript
type Max10 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 10;
type QueueUrl = Brand<string, 'QueueUrl'>;
type QueueName = Brand<string, 'QueueName'>;

interface SQSEvent<T> {
  timestamp: EpochMS;
  trace?: string;
  data: T;
  republishContext?: {
    publishCount?: number;
    maxPublishExpiration?: EpochMS;
    processAfter?: EpochMS;
  };
}

type MessageProcessorResult = void | RetryMessageLater | RepublishMessage;

interface RetryMessageLater {
  type: 'retry-later';
  reason: string;
  retryInSeconds: Seconds;
}

interface RepublishMessage {
  type: 'republish-later';
  reason: string;
  retryInSeconds: Seconds | {
    type: 'exponential-backoff';
    max: Seconds;
    min: Seconds;
  };
  expireFromFirstPublishMS?: Milliseconds;
}
```

## Best Practices

1. **Use Republish for Smart Retries**: Prefer `republish-later` over `retry-later` when you have sophisticated retry logic or don't want retries counting toward DLQ delivery attempts.

2. **Set Expiration Times**: When using `republish-later`, consider setting `expireFromFirstPublishMS` to prevent infinite retry loops.

3. **Graceful Shutdown**: Always use `runSQS()` or manually handle shutdown signals to ensure clean consumer termination.

4. **Batch When Possible**: Publish multiple messages at once to reduce API calls and improve throughput.

5. **Monitor Metrics**: The module automatically tracks `sqs.time_in_queue_ms`, `sqs.processing_time_ms`, `sqs.processing_error`, and `sqs.invalid_payload` metrics.

6. **Type Your Messages**: Always use TypeScript generics to ensure type safety across publishers and consumers.

7. **Handle Unprocessable Messages**: Messages that repeatedly fail will go to the DLQ. Set up appropriate DLQ monitoring and alerting.

8. **Use Long Polling**: The default 20-second long poll reduces costs and improves message delivery latency.

## Architecture Notes

- **Message Structure**: All messages are wrapped in an `SQSEvent<T>` envelope that includes timestamp, trace ID, and republish context
- **Trace Propagation**: Trace IDs are automatically generated and propagated through message lifecycle for distributed tracing
- **Visibility Management**: The module handles message visibility for both retry strategies appropriately
- **Error Handling**: Unhandled errors are logged with trace context and metrics but don't affect other messages in the batch
- **Development Proxy**: In non-production environments, messages can be proxied to additional queues for testing