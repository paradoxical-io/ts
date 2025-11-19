# Locking Module

A lightweight, interface-based locking mechanism for coordinating access to shared resources in Node.js applications. This module provides a simple API for acquiring and releasing locks with automatic timeout support.

## Features

- Simple, Promise-based API for acquiring and releasing locks
- Timeout-based lock expiration to prevent deadlocks
- Interface-driven design for easy implementation with different backends (Redis, in-memory, etc.)
- Type-safe TypeScript interfaces
- No-op implementation for testing and development scenarios

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Core Concepts

### LockApi Interface

The `LockApi` interface defines the contract for lock implementations:

```typescript
interface LockApi {
  tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined>;
}
```

### Lock Interface

A `Lock` represents an acquired lock that can be released:

```typescript
interface Lock {
  type: 'lock';
  release(): Promise<void>;
}
```

## Usage

### Basic Lock Acquisition

```typescript
import { LockApi } from '@paradoxical-io/common-server/locking';
import { InMemoryLock } from '@paradoxical-io/common-server/test/inMemoryLock';

const lockApi: LockApi = new InMemoryLock();

async function processOrder(orderId: string) {
  // Try to acquire a lock for this order with a 30-second timeout
  const lock = await lockApi.tryAcquire(`order:${orderId}`, 30);

  if (!lock) {
    console.log('Could not acquire lock - another process is handling this order');
    return;
  }

  try {
    // Process the order while holding the lock
    await updateOrderStatus(orderId);
    await chargePayment(orderId);
    await sendConfirmationEmail(orderId);
  } finally {
    // Always release the lock when done
    await lock.release();
  }
}
```

### Preventing Race Conditions

```typescript
import { LockApi } from '@paradoxical-io/common-server/locking';

async function incrementCounter(
  lockApi: LockApi,
  counterId: string
): Promise<boolean> {
  const lock = await lockApi.tryAcquire(`counter:${counterId}`, 10);

  if (!lock) {
    return false; // Lock not available
  }

  try {
    const currentValue = await getCounterValue(counterId);
    await setCounterValue(counterId, currentValue + 1);
    return true;
  } finally {
    await lock.release();
  }
}
```

### Using NoOpLock for Testing

The `NoOpLock` implementation is useful for testing scenarios where you want to simulate lock behavior without actual locking:

```typescript
import { NoOpLock } from '@paradoxical-io/common-server/locking';

// Always succeeds (unlocked mode)
const alwaysUnlocked = new NoOpLock(false);
const lock1 = await alwaysUnlocked.tryAcquire('key', 30); // Returns a lock
const lock2 = await alwaysUnlocked.tryAcquire('key', 30); // Also returns a lock

// Always fails (locked mode)
const alwaysLocked = new NoOpLock(true);
const lock3 = await alwaysLocked.tryAcquire('key', 30); // Returns undefined
```

### Implementing Custom Lock Backends

You can implement the `LockApi` interface for different backends (Redis, DynamoDB, etc.):

```typescript
import { LockApi, Lock } from '@paradoxical-io/common-server/locking';

class RedisLock implements LockApi {
  constructor(private redisClient: RedisClient) {}

  async tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined> {
    // Use Redis SET NX EX for atomic lock acquisition
    const lockKey = `lock:${key}`;
    const acquired = await this.redisClient.set(
      lockKey,
      'locked',
      'EX',
      timeoutSeconds,
      'NX'
    );

    if (!acquired) {
      return undefined;
    }

    return {
      type: 'lock',
      release: async () => {
        await this.redisClient.del(lockKey);
      },
    };
  }
}
```

## API Reference

### `LockApi.tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined>`

Attempts to acquire a lock for the given key.

**Parameters:**
- `key`: Unique identifier for the resource to lock
- `timeoutSeconds`: How long the lock should be held before automatically expiring

**Returns:**
- `Lock` object if the lock was successfully acquired
- `undefined` if the lock is already held by another process

**Example:**
```typescript
const lock = await lockApi.tryAcquire('user:123', 60);
if (lock) {
  // Lock acquired, do work
  await lock.release();
}
```

### `Lock.release(): Promise<void>`

Releases the acquired lock, making it available for other processes.

**Example:**
```typescript
const lock = await lockApi.tryAcquire('resource', 30);
try {
  // Do work
} finally {
  await lock.release(); // Always release in a finally block
}
```

## Implementations

### InMemoryLock

An in-memory implementation suitable for testing and single-instance applications. Located at `/test/inMemoryLock.ts`, it provides:

- Automatic lock expiration based on timeout
- Time provider injection for testing
- Map-based lock storage

**Example:**
```typescript
import { InMemoryLock } from '@paradoxical-io/common-server/test/inMemoryLock';

const lockApi = new InMemoryLock();
```

### NoOpLock

A no-operation implementation that simulates locked or unlocked behavior without actual locking.

**Example:**
```typescript
import { NoOpLock } from '@paradoxical-io/common-server/locking';

// For testing scenarios where locks should always succeed
const noOpLock = new NoOpLock(false);
```

## Best Practices

1. **Always release locks**: Use try-finally blocks to ensure locks are released even if errors occur

2. **Set appropriate timeouts**: Choose timeout values that are longer than your expected operation time but short enough to prevent extended blocking

3. **Handle lock acquisition failures**: Always check if `tryAcquire` returns `undefined` and have a strategy for handling unavailable locks

4. **Use descriptive keys**: Include resource type and ID in lock keys (e.g., `order:12345`, `user:session:abc`)

5. **Avoid nested locks**: Be cautious about acquiring multiple locks to prevent deadlock scenarios

## Common Patterns

### Retry with Backoff

```typescript
async function acquireWithRetry(
  lockApi: LockApi,
  key: string,
  maxAttempts = 3
): Promise<Lock | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    const lock = await lockApi.tryAcquire(key, 30);
    if (lock) return lock;

    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
  }
  return undefined;
}
```

### Lock Guard Pattern

```typescript
async function withLock<T>(
  lockApi: LockApi,
  key: string,
  timeoutSeconds: number,
  fn: () => Promise<T>
): Promise<T | undefined> {
  const lock = await lockApi.tryAcquire(key, timeoutSeconds);
  if (!lock) return undefined;

  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

// Usage
const result = await withLock(lockApi, 'resource:123', 30, async () => {
  return await processResource();
});
```

## License

MIT
