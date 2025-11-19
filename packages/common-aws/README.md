# @paradoxical-io/common-aws

A comprehensive TypeScript library providing high-level abstractions and utilities for AWS services. This package simplifies common AWS operations with type-safe APIs, built-in error handling, monitoring, and testing utilities.

## Overview

`@paradoxical-io/common-aws` is designed to reduce boilerplate and complexity when working with AWS services in Node.js applications. It provides battle-tested implementations of common patterns like distributed locking, message queuing, secure storage, and more.

## Features

- Type-safe APIs with full TypeScript support
- Built-in performance monitoring and distributed tracing
- Docker-based testing utilities for local development
- Automatic retry strategies and error handling
- Production-ready implementations of common AWS patterns
- Minimal configuration required

## Installation

```bash
npm install @paradoxical-io/common-aws
# or
yarn add @paradoxical-io/common-aws
```

## Available Modules

### [DynamoDB](./src/dynamo/README.md)

High-level abstractions for common DynamoDB patterns:

- **Distributed Locking** - TTL-based locks with automatic expiration
- **Key-Value Storage** - Simple and partitioned storage patterns
- **Atomic Counters** - Thread-safe increment/decrement operations
- **Rate Limiting** - Time-based attempt tracking with automatic expiration
- **Do-Once Actions** - Idempotent action execution per user

```typescript
import { DynamoLock, KeyValueTable } from '@paradoxical-io/common-aws';

const lock = new DynamoLock({ tableName: 'locks' });
const acquired = await lock.tryAcquire('resource-id', 30);

const kv = new KeyValueTable({ namespace: 'cache', tableName: 'keys' });
await kv.set('user-123', { name: 'John' });
```

[View DynamoDB Documentation](./src/dynamo/README.md)

### [S3](./src/s3/README.md)

Secure S3 storage with envelope encryption and streaming utilities:

- **Secure Storage** - Envelope encryption using KMS for sensitive data
- **Object Download** - Stream S3 objects directly to local files
- **List Objects** - Async generators for efficient bucket iteration
- **Testing Support** - Local S3-compatible environment for integration tests

```typescript
import { S3SecureStore, downloadObject } from '@paradoxical-io/common-aws';

const secureStore = new S3SecureStore({
  s3Bucket: 'my-bucket',
  kmsKeyID: 'arn:aws:kms:...'
});

await secureStore.set('sensitive-data', Buffer.from('secret'));
const data = await secureStore.get('sensitive-data');
```

[View S3 Documentation](./src/s3/README.md)

### [SQS](./src/sqs/README.md)

Robust message queue implementation with advanced retry strategies:

- **Type-Safe Messaging** - Strongly typed publishers and consumers
- **Advanced Retry** - Immediate retry, deferred republishing, exponential backoff
- **Message Deferral** - Schedule messages beyond SQS's 15-minute limit
- **Distributed Tracing** - Automatic trace ID propagation
- **Graceful Shutdown** - Proper signal handling for clean termination

```typescript
import { SQSPublisher, SQSConsumer } from '@paradoxical-io/common-aws';

const publisher = new SQSPublisher<UserEvent>(queueUrl);
await publisher.publish({ userId: '123', action: 'login' });

class OrderProcessor extends SQSConsumer<OrderEvent> {
  async process(data: OrderEvent) {
    // Process order
  }
}

const consumer = new OrderProcessor();
await consumer.start();
```

[View SQS Documentation](./src/sqs/README.md)

### [SNS](./src/sns/README.md)

Simple, type-safe wrapper for SMS messaging:

- SMS message sending with minimal configuration
- Support for Transactional and Promotional message types
- Built-in performance monitoring and logging

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';

const snsManager = new SNSManager();
await snsManager.sendSMS('+1234567890', 'Hello from AWS SNS!');
```

[View SNS Documentation](./src/sns/README.md)

### CloudFront

Utilities for managing CloudFront distributions and signed access:

- **Private Access** - Generate signed cookies for private CloudFront distributions
- **Secure Content Delivery** - Time-limited access to protected resources

```typescript
import { CloudfrontPrivateAccess } from '@paradoxical-io/common-aws';

const cloudfront = new CloudfrontPrivateAccess({
  distributionUrl: 'https://d123.cloudfront.net',
  privateKey: '...',
  publicKeyId: 'KEY123'
});

const cookies = await cloudfront.generateCookies(expiresAt);
```

### CloudWatch

CloudWatch Logs management utilities:

- **Log Export** - Export log groups to S3 buckets
- **Log Querying** - Filter and retrieve log events
- **Export Task Management** - Track and monitor export operations

```typescript
import { CloudwatchManager } from '@paradoxical-io/common-aws';

const cwManager = new CloudwatchManager();
const taskId = await cwManager.createExportTask({
  s3Bucket: 'logs-bucket',
  logGroupName: '/aws/lambda/my-function',
  from: startTime,
  to: endTime
});
```

### API Gateway WebSocket

WebSocket connection management for API Gateway:

- Publish messages to active WebSocket connections
- Automatic handling of stale connections
- Simple endpoint configuration

```typescript
import { ApiGatewayWebsocket } from '@paradoxical-io/common-aws';

const websocket = ApiGatewayWebsocket.createEndpoint(
  'wss://abc123.execute-api.us-east-1.amazonaws.com/prod'
);

await websocket.publish(connectionId, { message: 'Hello!' });
```

### Parameter Store

AWS Systems Manager Parameter Store integration:

- Value provider pattern for configuration management
- Support for encrypted parameters
- Reloadable configuration for dynamic updates

```typescript
import { defaultValueProvider } from '@paradoxical-io/common-aws';

const valueProvider = await defaultValueProvider();
const dbPassword = await valueProvider.get({
  type: 'ssm',
  key: '/prod/database/password'
});
```

### Lambda Utilities

Lambda function helpers for metrics and tracing:

- **Setup Lambda** - Automatic metrics and trace wrapping
- **Datadog Integration** - Built-in Datadog metrics support
- **Trace Management** - CLS-based trace ID propagation

```typescript
import { setupLambda } from '@paradoxical-io/common-aws';

export const handler = setupLambda(async (event, context) => {
  // Your Lambda logic with automatic tracing and metrics
  return { statusCode: 200 };
});
```

## Testing Utilities

Several modules include Docker-based testing utilities for local development:

- **S3Docker** - Local S3-compatible service (MinIO)
- **SQSDocker** - Local SQS service (ElasticMQ)
- **DynamoDocker** - Local DynamoDB service

```typescript
import { newS3Docker, newSqsDocker } from '@paradoxical-io/common-aws';

// Start local services for testing
const s3 = await newS3Docker();
const sqs = await newSqsDocker();

// Run your tests
// ...

// Clean up
await s3.container.stop();
await sqs.container.stop();
```

## Common Patterns

### Credentials Management

All AWS service clients can be configured with custom credentials:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: '...',
    secretAccessKey: '...'
  }
});
```

### Error Handling

The package provides consistent error handling across all modules:

```typescript
try {
  await publisher.publish(data);
} catch (error) {
  if (error instanceof SomeAWSError) {
    // Handle specific error
  }
  // All errors are logged with trace context
}
```

### Monitoring and Metrics

Built-in metrics tracking for performance monitoring:

- Queue time and processing time for SQS
- Execution time for SNS operations
- Lock acquisition and release timing
- Error rates and invalid payloads

Metrics integrate with Datadog by default but can be customized.

## Dependencies

This package uses AWS SDK v3 and requires the following peer dependencies:

- Node.js 14 or higher
- TypeScript 4.5 or higher (for development)

Core dependencies include:
- `@aws-sdk/client-*` - AWS SDK v3 clients
- `@paradoxical-io/types` - Shared type definitions
- `@paradoxical-io/common-server` - Server utilities

## Configuration

### Environment Variables

Many modules support configuration via environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Value Providers

Use the value provider pattern for dynamic configuration:

```typescript
import { defaultValueProvider } from '@paradoxical-io/common-aws';

const provider = await defaultValueProvider();

// Load from environment
const value1 = await provider.get({ type: 'env', key: 'DATABASE_URL' });

// Load from Parameter Store
const value2 = await provider.get({ type: 'ssm', key: '/prod/api-key' });

// Static value
const value3 = await provider.get({ type: 'static', value: 'default' });
```

## Best Practices

1. **Use Type Safety** - Leverage TypeScript generics for compile-time safety
2. **Handle Errors** - Always wrap AWS operations in try-catch blocks
3. **Monitor Performance** - Use built-in metrics for observability
4. **Test Locally** - Use Docker utilities for integration testing
5. **Graceful Shutdown** - Properly clean up resources and connections
6. **Batch Operations** - Use batch methods when working with multiple items
7. **Secure Credentials** - Never hard-code credentials, use IAM roles or Parameter Store

## Development

### Building

```bash
yarn compile
```

### Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test-int
```

### Linting

```bash
yarn lint
yarn lint:fix
```

## License

MIT

## Author

Anton Kropp

## Contributing

This package is part of the @paradoxical-io monorepo. Contributions are welcome following the repository's contribution guidelines.

## Related Packages

- [@paradoxical-io/common-server](../common-server) - Server utilities and middleware
- [@paradoxical-io/types](../types) - Shared type definitions
- [@paradoxical-io/common-test](../common-test) - Testing utilities

## Support

For issues, questions, or contributions, please refer to the main repository documentation.
