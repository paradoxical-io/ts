# Test Utilities Module

A collection of testing utilities for server-side applications, providing in-memory implementations and Docker container management for integration tests.

## Features

- **In-Memory Lock**: Thread-safe, in-memory implementation of the `LockApi` interface for testing distributed locking scenarios
- **Docker Container Management**: Programmatic Docker container lifecycle management with port mapping and log monitoring (internal use only)

## Exported Components

### InMemoryLock

An in-memory implementation of the `LockApi` interface that simulates distributed locking behavior for testing purposes. It provides automatic lock expiration and cleanup without requiring external dependencies like Redis or DynamoDB.

## Usage

### Basic Lock Acquisition and Release

```typescript
import { InMemoryLock } from '@paradoxical-io/common-server/test';

// Create an in-memory lock instance
const lockApi = new InMemoryLock();

// Try to acquire a lock with a 30-second timeout
const lock = await lockApi.tryAcquire('my-resource', 30);

if (lock) {
  try {
    // Perform operations while holding the lock
    console.log('Lock acquired, performing work...');
    await doSomeWork();
  } finally {
    // Always release the lock when done
    await lock.release();
  }
} else {
  console.log('Lock already held by another process');
}
```

### Testing Lock Contention

```typescript
import { InMemoryLock } from '@paradoxical-io/common-server/test';

const lockApi = new InMemoryLock();
const resourceKey = 'shared-resource';

// First acquisition succeeds
const lock1 = await lockApi.tryAcquire(resourceKey, 60);
expect(lock1).toBeDefined();

// Second acquisition fails while first lock is held
const lock2 = await lockApi.tryAcquire(resourceKey, 60);
expect(lock2).toBeUndefined();

// Release first lock
await lock1!.release();

// Third acquisition now succeeds
const lock3 = await lockApi.tryAcquire(resourceKey, 60);
expect(lock3).toBeDefined();
```

### Testing Lock Expiration

```typescript
import { InMemoryLock } from '@paradoxical-io/common-server/test';
import { fixedTimeProvider } from '@paradoxical-io/common';

// Create a custom time provider for testing
const timeProvider = fixedTimeProvider(new Date('2025-01-01T00:00:00Z'));
const lockApi = new InMemoryLock(timeProvider);

// Acquire a lock with 10-second timeout
const lock = await lockApi.tryAcquire('expiring-resource', 10);
expect(lock).toBeDefined();

// Attempt to acquire again - fails because lock is still held
const lock2 = await lockApi.tryAcquire('expiring-resource', 10);
expect(lock2).toBeUndefined();

// Advance time by 11 seconds
timeProvider.setTime(new Date('2025-01-01T00:00:11Z'));

// Lock has expired, new acquisition succeeds
const lock3 = await lockApi.tryAcquire('expiring-resource', 10);
expect(lock3).toBeDefined();
```

### Integration Testing with Real Lock Implementations

```typescript
import { InMemoryLock } from '@paradoxical-io/common-server/test';
import { LockApi } from '@paradoxical-io/common-server';

class DataProcessor {
  constructor(private lockApi: LockApi) {}

  async processWithLock(dataId: string): Promise<boolean> {
    const lock = await this.lockApi.tryAcquire(`process-${dataId}`, 300);

    if (!lock) {
      return false; // Another process is handling this
    }

    try {
      await this.processData(dataId);
      return true;
    } finally {
      await lock.release();
    }
  }

  private async processData(dataId: string): Promise<void> {
    // Processing logic here
  }
}

// In tests, use InMemoryLock
describe('DataProcessor', () => {
  it('prevents concurrent processing', async () => {
    const lockApi = new InMemoryLock();
    const processor = new DataProcessor(lockApi);

    // Start two concurrent processes
    const [result1, result2] = await Promise.all([
      processor.processWithLock('item-1'),
      processor.processWithLock('item-1'),
    ]);

    // Only one should succeed
    expect([result1, result2].filter(Boolean).length).toBe(1);
  });
});

// In production, inject a real lock implementation (Redis, DynamoDB, etc.)
const productionLock = new RedisLockApi(redisClient);
const processor = new DataProcessor(productionLock);
```

## API Reference

### InMemoryLock

#### Constructor

```typescript
constructor(timeProvider?: TimeProvider)
```

- `timeProvider` (optional): Custom time provider for testing time-dependent behavior. Defaults to the system time provider.

#### Methods

##### tryAcquire

```typescript
async tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined>
```

Attempts to acquire a lock for the specified key.

- **Parameters:**
  - `key`: Unique identifier for the resource to lock
  - `timeoutSeconds`: Duration in seconds before the lock automatically expires

- **Returns:**
  - `Lock` object if acquisition succeeds
  - `undefined` if the lock is already held by another caller

##### Lock.release

```typescript
async release(): Promise<void>
```

Releases the lock, making it available for other callers to acquire.

## Implementation Details

- Locks are stored in-memory using a `Map<string, LockMetadata>`
- Expired locks are automatically cleaned up on the next acquisition attempt
- Thread-safe for concurrent access within the same Node.js process
- Does not persist across process restarts
- Suitable for unit and integration tests, not for production use

## Notes

- The `docker` submodule provides container management utilities but is not exported in the main package interface
- This module is designed for testing scenarios where you need lock behavior without external infrastructure dependencies
- For production distributed locking, use implementations backed by Redis, DynamoDB, or other persistent stores
