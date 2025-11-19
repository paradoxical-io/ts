# DynamoDB Utilities

A collection of high-level DynamoDB abstractions for common data patterns including distributed locking, key-value storage, atomic counters, and rate limiting.

## Features

- **Distributed Locking** - TTL-based locks with automatic expiration
- **Key-Value Storage** - Simple and partitioned storage patterns
- **Atomic Counters** - Thread-safe increment/decrement operations
- **Rate Limiting** - Time-based attempt tracking with automatic expiration
- **Do-Once Actions** - Idempotent action execution per user
- **Type-Safe** - Full TypeScript support with branded types

## Installation

This module is part of `@paradoxical-io/common-aws`:

```bash
npm install @paradoxical-io/common-aws
```

## Core Components

### DynamoLock

Distributed locking mechanism using DynamoDB with TTL-based expiration.

```typescript
import { DynamoLock } from '@paradoxical-io/common-aws/dynamo';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const lock = new DynamoLock({
  dynamo: new DynamoDBClient(),
  tableName: dynamoTableName('locks')
});

// Try to acquire a lock for 30 seconds
const acquired = await lock.tryAcquire('my-resource-id', 30);

if (acquired) {
  try {
    // Do work while holding the lock
    await performCriticalOperation();
  } finally {
    // Release the lock when done
    await acquired.release();
  }
} else {
  console.log('Could not acquire lock - already held');
}
```

### KeyValueTable

Simple key-value storage for global, unsorted data. Best for de-duplication, temporary counters, or adhoc data storage.

```typescript
import { KeyValueTable } from '@paradoxical-io/common-aws/dynamo';

const kv = new KeyValueTable({
  namespace: 'events',
  tableName: dynamoTableName('keys')
});

// Store data
await kv.set('user-123-action', { action: 'login', timestamp: Date.now() });

// Retrieve data
const data = await kv.get<{ action: string; timestamp: number }>('user-123-action');

// Delete data
await kv.delete('user-123-action');

// Batch operations
await kv.setBatch(['key1', 'key2', 'key3']);
const items = await kv.getBatch<string>(['key1', 'key2', 'key3']);

// Stream all items with pagination
for await (const [key, value] of kv.streamAll(100, { keyContains: 'user-' })) {
  console.log(`${key}: ${JSON.stringify(value)}`);
}
```

### PartitionedKeyValueTable

Partitioned storage using partition and sort keys. Ideal for user-scoped or account-scoped data that needs batch retrieval.

```typescript
import { PartitionedKeyValueTable } from '@paradoxical-io/common-aws/dynamo';
import { CompoundKey } from '@paradoxical-io/types';

const table = new PartitionedKeyValueTable({
  tableName: dynamoTableName('partitioned_keys')
});

// Define a compound key with partition and sort key
const userPreference: CompoundKey<string, { theme: string }> = {
  partition: 'user-123',
  namespace: 'settings',
  sort: 'theme'
};

// Store data
await table.set(userPreference, { theme: 'dark' });

// Retrieve data
const theme = await table.get(userPreference);

// Check if key exists
const exists = await table.exists(userPreference);

// List all keys in a partition
for await (const items of table.listAll('user-123')) {
  items.forEach(({ key, value }) => {
    console.log(`${key}: ${value}`);
  });
}

// Delete specific key
await table.delete(userPreference);

// Clear entire partition
await table.clear('user-123');
```

#### Working with Sets

The `PartitionedKeyValueTable` supports set operations with optimistic locking using MD5 checksums:

```typescript
// Add items to a set
const tagsKey: CompoundKey<string, string[]> = {
  partition: 'user-123',
  namespace: 'profile',
  sort: 'tags'
};

await table.addToSet(tagsKey, ['javascript', 'typescript']);
await table.addToSet(tagsKey, 'python'); // Can add single items too

// Check if item exists in set
const hasTag = await table.existsInSet(tagsKey, 'typescript');

// Remove items from set
await table.removeFromSet(tagsKey, 'javascript');

// Update an item in a set
await table.updateInSet(
  tagsKey,
  'typescript-pro',
  (tag) => tag === 'typescript' // Replace typescript with typescript-pro
);
```

#### Atomic Operations

```typescript
// Set only if key doesn't exist (returns true if inserted, false if exists)
const inserted = await table.setIfNotExists(userPreference, { theme: 'light' });

// Batch operations
await table.setBatch([
  { key: key1, data: value1 },
  { key: key2, data: value2 }
]);
```

### KeyValueCounter

Atomic counter operations with namespacing support.

```typescript
import { KeyValueCounter, KeyValueScopedCounter } from '@paradoxical-io/common-aws/dynamo';

const counter = new KeyValueCounter({
  namespace: 'api-calls',
  tableName: dynamoTableName('keys')
});

// Increment counter
const newCount = await counter.incr('endpoint-login', 1);

// Decrement counter
await counter.decr('endpoint-login', 1);

// Get current counts
const counts = await counter.get(['endpoint-login', 'endpoint-signup']);
// Returns: [{ id: 'endpoint-login', count: 42 }, { id: 'endpoint-signup', count: 10 }]

// Reset counter
await counter.delete('endpoint-login');

// Scoped counter for typed keys
const scopedCounter = new KeyValueScopedCounter(
  (userId: string) => `user-${userId}`,
  counter
);

await scopedCounter.inc('user-123', 5);
const current = await scopedCounter.current('user-123'); // Returns 5
```

### DoOnceManager

Track one-time actions per user to ensure idempotency.

```typescript
import { DoOnceManager } from '@paradoxical-io/common-aws/dynamo';

const doOnce = new DoOnceManager(
  new PartitionedKeyValueTable()
);

// Execute action only once per user
const result = await doOnce.doOnce(
  'user-123',
  'welcome-email',
  async () => {
    await sendWelcomeEmail('user-123');
    return { sent: true };
  }
);

if (result.didAction) {
  console.log('Email sent at:', result.at);
  console.log('Response:', result.actionResponse);
} else {
  console.log('Email already sent previously');
}

// Check if action was done
const alreadyDone = await doOnce.haveAlreadyDone('user-123', 'welcome-email');

// Clear action (allow it to be done again)
await doOnce.clearKey('user-123', 'welcome-email');
```

### LimitedAttempt

Time-based attempt limiting with automatic expiration.

```typescript
import { LimitedAttempt } from '@paradoxical-io/common-aws/dynamo';
import { CompoundKey } from '@paradoxical-io/types';

const limiter = new LimitedAttempt(
  new PartitionedKeyValueTable()
);

const attemptKey: CompoundKey<string, any> = {
  partition: 'password-reset',
  namespace: 'attempts',
  sort: 'user-123'
};

try {
  const attempt = await limiter.attempt(
    attemptKey,
    {
      attemptsMax: 3,
      validityTime: 3600000 // 1 hour in milliseconds
    },
    'some-context-data' // Optional context to store
  );

  if (attempt) {
    // Process the attempt
    await processPasswordReset('user-123');

    // Clear attempts on success
    await attempt.clear();
  }
} catch (error) {
  if (error instanceof AttemptsError) {
    console.log('Too many attempts - please try again later');
  }
}
```

## Utility Functions

### Table Naming

```typescript
import { dynamoTableName, assertTableNameValid } from '@paradoxical-io/common-aws/dynamo';

// Creates table name in format: paradox.<env>.<name>
const tableName = dynamoTableName('users'); // e.g., "paradox.prod.users"

// Validate table name includes environment
assertTableNameValid(tableName); // Throws if invalid
```

### DynamoDB Mapper

```typescript
import { DynamoDao, dynamoAssign } from '@paradoxical-io/common-aws/dynamo';

class UserDao implements DynamoDao {
  id!: string;
  name!: string;
  email!: string;
}

// Helper to create instances with partial data
const user = dynamoAssign(UserDao, { id: '123', name: 'John' });
```

## Best Practices

### Choosing the Right Storage Pattern

- **KeyValueTable**: Use for global, unsorted data like de-duplication keys, temporary flags, or simple counters. Not suitable for batch retrieval by partition.

- **PartitionedKeyValueTable**: Use for data that needs to be grouped by entity (user, account, etc.) and retrieved in batches. Supports sort keys for organization within a partition.

- **KeyValueCounter**: Use for atomic counter operations when you need thread-safe increments/decrements.

### Namespace Usage

Namespaces help organize keys within the same table:

```typescript
// Without namespace
const kv = new KeyValueTable({ namespace: '' });
await kv.set('key', data); // Stored as "key"

// With namespace
const kv = new KeyValueTable({ namespace: 'events' });
await kv.set('key', data); // Stored as "events.key"
```

### Error Handling

All operations may throw standard AWS SDK errors. Common patterns:

```typescript
try {
  await table.set(key, data);
} catch (error) {
  if (error instanceof ResourceNotFoundException) {
    // Table doesn't exist
  } else if (error instanceof ConditionalCheckFailedException) {
    // Condition not met (e.g., in setIfNotExists)
  } else {
    // Other errors
  }
}
```

### Performance Considerations

- **Batch Operations**: Use `getBatch` and `setBatch` when working with multiple items to reduce API calls.
- **Streaming**: Use `streamAll` with appropriate page sizes and delays to avoid throttling.
- **Partitions**: Design partition keys to distribute load evenly across DynamoDB partitions.
- **Set Operations**: The `addToSet` and `removeFromSet` methods use optimistic locking and may retry on conflicts.

## API Reference

### DynamoLock

| Method | Description |
|--------|-------------|
| `tryAcquire(key: string, timeoutSeconds: number)` | Attempts to acquire a lock, returns Lock object or undefined |
| `lock.release()` | Releases the acquired lock |

### KeyValueTable

| Method | Description |
|--------|-------------|
| `get<T>(id: string)` | Get a single item |
| `getBatch<T>(ids: string[])` | Get multiple items |
| `set<T>(id: string, data: T)` | Store a single item |
| `delete(id: string)` | Delete an item |
| `listAll<K, V>(options?)` | List all items with pagination |
| `streamAll<T>(perPage, options?)` | Stream all items as async generator |

### PartitionedKeyValueTable

| Method | Description |
|--------|-------------|
| `get<T>(key: CompoundKey)` | Get item by compound key |
| `set<T>(key: CompoundKey, data: T)` | Store item |
| `setBatch(items[])` | Store multiple items |
| `setIfNotExists<T>(key: CompoundKey, data: T)` | Store only if doesn't exist |
| `exists(key: CompoundKey)` | Check if key exists |
| `delete(key: CompoundKey)` | Delete specific sort key |
| `clear(partition: string)` | Delete entire partition |
| `listAll(partition: string)` | List all items in partition |
| `addToSet(key, data, inclusion?)` | Add to set with deduplication |
| `removeFromSet(key, data, inclusion?)` | Remove from set |
| `existsInSet(key, data, inclusion?)` | Check if item in set |
| `updateInSet(key, data, inclusion?)` | Update item in set |

### KeyValueCounter

| Method | Description |
|--------|-------------|
| `incr(id: string, by?: number)` | Increment counter atomically |
| `decr(id: string, by?: number)` | Decrement counter atomically |
| `get(ids: string[])` | Get current counts |
| `delete(id: string)` | Reset counter |

### DoOnceManager

| Method | Description |
|--------|-------------|
| `doOnce(userId, key, action)` | Execute action once per user |
| `haveAlreadyDone(userId, key)` | Check if action completed |
| `markDone(userId, key)` | Mark action as done |
| `clearKey(userId, key)` | Clear action state |

### LimitedAttempt

| Method | Description |
|--------|-------------|
| `attempt(key, config, context?)` | Attempt action with rate limiting |

## TypeScript Types

```typescript
import {
  DynamoTableName,
  CompoundKey,
  KeyCount,
  KeyValueList,
  PartitionKeyMappings,
  ResetState,
  DoOnceResult
} from '@paradoxical-io/common-aws/dynamo';
```

## Dependencies

- `@aws-sdk/client-dynamodb` - AWS DynamoDB SDK v3
- `@aws/dynamodb-data-mapper-annotations` - DynamoDB data mapper
- `@paradoxical-io/types` - Shared type definitions
- `@paradoxical-io/common-server` - Server utilities

## License

MIT