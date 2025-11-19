# SNS Module

A simple, type-safe wrapper for AWS SNS (Simple Notification Service) that provides SMS messaging capabilities with built-in logging and performance monitoring.

## Features

- Simple SMS message sending with minimal configuration
- Support for both Transactional and Promotional message types
- Automatic performance monitoring via decorators
- Built-in structured logging
- Type-safe API with TypeScript support
- Easy-to-use SNSClient management

## Installation

This module is part of the `@paradoxical-io/common-aws` package:

```bash
npm install @paradoxical-io/common-aws
# or
yarn add @paradoxical-io/common-aws
```

## Prerequisites

Ensure you have AWS credentials configured in your environment. The SNSClient will use the default AWS credential provider chain.

## Usage

### Basic SMS Sending

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';

// Create an instance with default SNSClient
const snsManager = new SNSManager();

// Send a promotional SMS (default)
await snsManager.sendSMS('+1234567890', 'Hello from AWS SNS!');
```

### Transactional SMS

For time-sensitive messages like one-time passwords or authentication codes:

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';

const snsManager = new SNSManager();

// Send a transactional SMS
await snsManager.sendSMS(
  '+1234567890',
  'Your verification code is: 123456',
  { mode: 'Transactional' }
);
```

### Custom SNS Client Configuration

You can provide your own configured SNSClient for advanced use cases:

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';
import { SNSClient } from '@aws-sdk/client-sns';

// Create a custom SNS client with specific configuration
const customClient = new SNSClient({
  region: 'us-west-2',
  maxAttempts: 3,
});

const snsManager = new SNSManager(customClient);

await snsManager.sendSMS('+1234567890', 'Hello with custom config!');
```

### Using the Static Factory Method

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';

// Create a new SNSClient using the static factory
const snsClient = SNSManager.newSNSClient();
const snsManager = new SNSManager(snsClient);

await snsManager.sendSMS('+1234567890', 'Factory-created client message');
```

### Error Handling

```typescript
import { SNSManager } from '@paradoxical-io/common-aws';

const snsManager = new SNSManager();

try {
  const result = await snsManager.sendSMS(
    '+1234567890',
    'Your message here',
    { mode: 'Transactional' }
  );

  console.log('Message sent successfully:', result.MessageId);
} catch (error) {
  console.error('Failed to send SMS:', error);
}
```

## API Reference

### SNSManager

#### Constructor

```typescript
constructor(sns?: SNSClient)
```

Creates a new SNSManager instance. If no SNSClient is provided, a default one will be created.

**Parameters:**
- `sns` (optional): An AWS SNSClient instance

#### Static Methods

##### `newSNSClient()`

```typescript
static newSNSClient(): SNSClient
```

Factory method that creates a new SNSClient with default configuration.

**Returns:** A new SNSClient instance

#### Instance Methods

##### `sendSMS()`

```typescript
async sendSMS(
  phoneNumber: string,
  message: string,
  opts?: { mode: 'Transactional' | 'Promotional' }
): Promise<PublishCommandOutput>
```

Sends an SMS message to the specified phone number.

**Parameters:**
- `phoneNumber`: The recipient's phone number in E.164 format (e.g., '+1234567890')
- `message`: The text message to send
- `opts` (optional): Configuration options
  - `mode`: Either 'Transactional' or 'Promotional' (default: 'Promotional')

**Returns:** A Promise resolving to `PublishCommandOutput` from AWS SDK

**Message Types:**
- **Promotional**: Cost-optimized for non-critical messages like marketing content
- **Transactional**: Higher priority and reliability for critical messages like OTPs and alerts

**Features:**
- Automatically logs the phone number and message for debugging
- Tracks execution time with the `@timed` decorator for performance monitoring
- Sets appropriate AWS SNS message attributes based on the message type

## Performance Monitoring

The `sendSMS` method is decorated with `@timed`, which automatically tracks execution time with the following metric:

- **Stat Name**: `aws_sns.delay_ms`
- **Tags**: `{ method: 'publishSMS' }`

This allows you to monitor SMS delivery performance in your metrics system.

## Phone Number Format

Phone numbers must be in E.164 format:
- Include the country code
- No spaces, dashes, or parentheses
- Start with a `+` sign

**Examples:**
- US: `+12345678900`
- UK: `+447123456789`
- Australia: `+61412345678`

## AWS Permissions

The SNSClient requires the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

## Dependencies

- `@aws-sdk/client-sns`: AWS SDK v3 SNS client
- `@paradoxical-io/common-server`: Logging and monitoring utilities

## Best Practices

1. **Phone Number Validation**: Always validate phone numbers before sending
2. **Rate Limiting**: Implement rate limiting to avoid hitting AWS SNS quotas
3. **Error Handling**: Always wrap `sendSMS` calls in try-catch blocks
4. **Message Type Selection**: Use 'Transactional' for critical messages, 'Promotional' for marketing
5. **Cost Optimization**: Be aware that SMS costs vary by country and message type
6. **Logging**: The module logs phone numbers, ensure this complies with your privacy policies

## Related AWS Documentation

- [AWS SNS SMS Documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-phone-number-as-subscriber.html)
- [SMS Message Attributes](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)