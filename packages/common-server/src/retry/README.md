# Retry Module

A comprehensive retry and polling utilities library for TypeScript/Node.js applications. This module provides decorator-based method retries, exponential backoff polling, and linear polling with configurable timeout and retry strategies.

## Features

- **Method Retry Decorator**: Automatically retry async methods with exponential backoff using the `@retry` decorator
- **Axios-Specific Retry**: Pre-configured retry decorator for Axios HTTP calls with configurable status code handling
- **Exponential Polling**: Poll for data with exponential backoff until a result is available or timeout occurs
- **Linear Polling**: Poll for data at fixed intervals until a result is available or timeout occurs
- **Type-Safe Results**: Discriminated union types for handling success and timeout scenarios
- **Configurable Backoff**: Full control over retry timing, attempts, and exponential factors

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Usage

### Retry Decorator

Use the `@retry` decorator to automatically retry async methods that throw errors:

```typescript
import { retry } from '@paradoxical-io/common-server';

class DatabaseService {
  @retry({ retries: 3, minTimeout: 100, maxTimeout: 5000 })
  async fetchUser(userId: string): Promise<User> {
    // This method will automatically retry up to 3 times
    // with exponential backoff between 100ms and 5000ms
    const response = await this.db.query('SELECT * FROM users WHERE id = ?', [userId]);
    return response.rows[0];
  }
}
```

### Axios Retry

For HTTP requests, use the `axiosRetry` decorator which automatically bails on client errors (4xx by default):

```typescript
import { axiosRetry } from '@paradoxical-io/common-server';
import axios from 'axios';

class ApiClient {
  // Retries on 5xx errors, but skips retry on 400 Bad Request
  @axiosRetry([400])
  async fetchData(endpoint: string): Promise<Data> {
    const response = await axios.get(`https://api.example.com/${endpoint}`);
    return response.data;
  }

  // Custom configuration with different skip codes
  @axiosRetry([400, 404], { retries: 5, maxTimeout: 10000 })
  async fetchOptionalResource(id: string): Promise<Resource | null> {
    const response = await axios.get(`https://api.example.com/resources/${id}`);
    return response.data;
  }
}
```

### Advanced Retry with Bail Condition

You can provide custom logic to bail out of retries early:

```typescript
import { retry } from '@paradoxical-io/common-server';

class PaymentService {
  @retry({
    retries: 5,
    minTimeout: 1000,
    maxTimeout: 30000,
    // Bail immediately on validation errors
    bailOn: (error: Error) => error.name === 'ValidationError',
  })
  async processPayment(amount: number): Promise<PaymentResult> {
    return await this.paymentGateway.charge(amount);
  }
}
```

### Exponential Polling

Poll for a condition with exponential backoff:

```typescript
import { exponentialPoll } from '@paradoxical-io/common-server';
import { asMilli } from '@paradoxical-io/common';

async function waitForJobCompletion(jobId: string) {
  const result = await exponentialPoll(
    async () => {
      const job = await getJobStatus(jobId);
      // Return undefined to continue polling, or return data to complete
      return job.status === 'completed' ? job : undefined;
    },
    {
      retries: 10,
      minTimeout: 100,
      maxTimeout: 5000,
      factor: 2, // Double the wait time on each retry
      expiresAfter: asMilli(5, 'minutes'),
    }
  );

  if (result.type === 'completed') {
    console.log('Job completed:', result.data);
  } else {
    console.log('Job timed out after 5 minutes');
  }
}
```

### Linear Polling

Poll for a condition at fixed intervals:

```typescript
import { linearPoll } from '@paradoxical-io/common-server';
import { Milliseconds } from '@paradoxical-io/types';

async function waitForServerReady(url: string) {
  const result = await linearPoll(
    async () => {
      try {
        const response = await fetch(url);
        return response.ok ? response : undefined;
      } catch {
        return undefined;
      }
    },
    30000 as Milliseconds, // Expire after 30 seconds
    1000 as Milliseconds // Check every 1 second
  );

  if (result.type === 'completed') {
    console.log('Server is ready!');
  } else {
    console.log('Server failed to become ready within 30 seconds');
  }
}
```

## API Reference

### `@retry(options?)`

A method decorator that automatically retries async methods on failure.

**Options:**

- `retries?: number` - Maximum number of retry attempts (default: 10)
- `minTimeout?: number` - Minimum wait time in milliseconds between retries (default: 1000)
- `maxTimeout?: number` - Maximum wait time in milliseconds between retries (default: Infinity)
- `factor?: number` - Exponential factor for backoff (default: 2)
- `bailOn?: (error: Error) => boolean` - Function to determine if retry should be skipped for specific errors
- `onRetry?: (error: Error, attempt: number) => void` - Callback invoked on each retry attempt

**Note:** Only works with async methods. Throws an error if applied to synchronous methods.

### `@axiosRetry(skipCodes?, options?)`

A specialized retry decorator for Axios HTTP requests.

**Parameters:**

- `skipCodes?: number[]` - HTTP status codes to skip retrying (default: `[400]`)
- `options?: asyncRetry.Options` - Additional retry options

**Defaults:**

- `retries: 3`
- `maxTimeout: 5000ms`
- Automatically bails on specified HTTP status codes

### `exponentialPoll<T>(block, options, time?)`

Polls a function with exponential backoff until it returns a value or times out.

**Parameters:**

- `block: () => Promise<T | undefined>` - Function to poll; return `undefined` to continue polling
- `options: asyncRetry.Options & { expiresAfter: Milliseconds }` - Retry options plus absolute expiration time
- `time?: TimeProvider` - Optional time provider for testing

**Returns:** `Promise<Result<T>>` where `Result<T>` is:

- `{ type: 'completed', data: T }` - Successfully retrieved data
- `{ type: 'timeout' }` - Polling timed out

### `linearPoll<T>(block, expiresIn, waitTime, time?)`

Polls a function at fixed intervals until it returns a value or times out.

**Parameters:**

- `block: () => Promise<T | undefined>` - Function to poll; return `undefined` to continue polling
- `expiresIn: Milliseconds` - Time until polling expires
- `waitTime: Milliseconds` - Wait time between each poll attempt
- `time?: TimeProvider` - Optional time provider for testing

**Returns:** `Promise<Result<T>>` - Same result type as `exponentialPoll`

## Best Practices

1. **Choose the Right Strategy:**

   - Use `@retry` for transient failures in method calls
   - Use `axiosRetry` for HTTP requests
   - Use `exponentialPoll` when you want to reduce load on the polled resource
   - Use `linearPoll` when you need predictable polling intervals

2. **Set Appropriate Timeouts:**

   - Always set `expiresAfter` or `expiresIn` to prevent infinite polling
   - Configure `maxTimeout` to prevent excessive wait times

3. **Handle Both Success and Timeout:**

   ```typescript
   const result = await exponentialPoll(...);

   if (result.type === 'completed') {
     // Handle success case
     processData(result.data);
   } else {
     // Handle timeout case
     throw new Error('Operation timed out');
   }
   ```

4. **Use Bail Conditions Wisely:**
   - Bail on non-retryable errors (validation errors, authentication failures)
   - Continue retrying on transient errors (network timeouts, 503 errors)

## Dependencies

This module depends on:

- `async-retry` - For retry logic implementation
- `@paradoxical-io/common` - For time utilities and helpers
- `@paradoxical-io/types` - For type definitions
- `axios` - For HTTP error detection (optional, only if using `axiosRetry`)
