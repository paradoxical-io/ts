# Contracts Module

TypeScript interfaces defining standardized contracts for common server infrastructure patterns. These contracts provide type-safe abstractions for health checks, partitioned key-value storage, and atomic counter operations.

## Features

- **Health Check Interface** - Standard contract for service health monitoring
- **Partitioned Key-Value Storage** - Type-safe interface for distributed key-value operations with partition support
- **Atomic Counter Operations** - Contract for thread-safe increment/decrement operations
- **Type Safety** - Leverages TypeScript generics for compile-time type checking

## Overview

This module exports three core interfaces that define contracts for common infrastructure patterns. These interfaces can be implemented by various backend services (Redis, DynamoDB, in-memory stores, etc.) to provide consistent APIs across your application.

## Interfaces

### HealthCheck

A simple interface for implementing health check endpoints in services.

```typescript
import { HealthCheck } from '@paradoxical-io/common-server/contracts';

class DatabaseHealthCheck implements HealthCheck {
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Use in an HTTP endpoint
app.get('/health', async (req, res) => {
  const isHealthy = await healthCheck.healthCheck();
  res.status(isHealthy ? 200 : 503).json({ healthy: isHealthy });
});
```

### PartitionedKeyReaderWriter

Interface for reading and writing values in a partitioned key-value store. Uses `CompoundKey` from `@paradoxical-io/types` to provide type-safe keys with partition, sort, and namespace components.

```typescript
import { PartitionedKeyReaderWriter } from '@paradoxical-io/common-server/contracts';
import { CompoundKey } from '@paradoxical-io/types';

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
}

class RedisKeyValueStore implements PartitionedKeyReaderWriter {
  async getValue<T, P extends string>(
    key: CompoundKey<P, T>
  ): Promise<T | undefined> {
    const fullKey = `${key.namespace}:${key.partition}:${key.sort}`;
    const value = await this.redis.get(fullKey);
    return value ? JSON.parse(value) : undefined;
  }

  async setValue<T, P extends string>(
    key: CompoundKey<P, T>,
    data: T
  ): Promise<void> {
    const fullKey = `${key.namespace}:${key.partition}:${key.sort}`;
    await this.redis.set(fullKey, JSON.stringify(data));
  }
}

// Usage example
const store = new RedisKeyValueStore();

const prefsKey: CompoundKey<'user-123', UserPreferences> = {
  partition: 'user-123',
  sort: 'preferences' as SortKey,
  namespace: 'app:settings'
};

// Write preferences
await store.setValue(prefsKey, {
  theme: 'dark',
  notifications: true
});

// Read preferences (type-safe!)
const prefs = await store.getValue(prefsKey);
if (prefs) {
  console.log(prefs.theme); // TypeScript knows this is 'light' | 'dark'
}
```

### PartitionedKeyCounter

Interface for atomic counter operations on partitioned keys. Ideal for tracking counts, quotas, or distributed counters.

```typescript
import { PartitionedKeyCounter } from '@paradoxical-io/common-server/contracts';
import { CompoundKey, SortKey } from '@paradoxical-io/types';

class RedisCounterStore implements PartitionedKeyCounter {
  async getCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    const key = `${id.namespace}:${id.partition}:${id.sort}`;
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : undefined;
  }

  async incrCounter<P extends string>(
    id: CompoundKey<P, number>,
    by: number = 1
  ): Promise<number | undefined> {
    const key = `${id.namespace}:${id.partition}:${id.sort}`;
    const result = await this.redis.incrby(key, by);
    return result;
  }

  async decrCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    const key = `${id.namespace}:${id.partition}:${id.sort}`;
    const result = await this.redis.decr(key);
    return result;
  }
}

// Usage example
const counter = new RedisCounterStore();

const apiCallsKey: CompoundKey<'user-456', number> = {
  partition: 'user-456',
  sort: 'api-calls' as SortKey,
  namespace: 'rate-limits'
};

// Increment API call count
const currentCount = await counter.incrCounter(apiCallsKey);
console.log(`User has made ${currentCount} API calls`);

// Check if user has exceeded quota
const count = await counter.getCounter(apiCallsKey);
if (count && count > 1000) {
  throw new Error('Rate limit exceeded');
}

// Decrement for refunds/corrections
await counter.decrCounter(apiCallsKey);
```

## CompoundKey Structure

The `CompoundKey` type from `@paradoxical-io/types` provides a structured approach to key-value storage:

```typescript
interface CompoundKey<PartitionKey extends string, Value = unknown> {
  partition: PartitionKey;  // Grouping key (e.g., 'user-123', 'global')
  sort: SortKey;            // Data key within partition
  namespace: string;        // Additional namespacing for key isolation
}
```

This structure is particularly useful for:
- **DynamoDB**: Maps directly to partition key and sort key
- **Redis**: Can be combined into hierarchical key patterns
- **Multi-tenancy**: Partition by tenant/user ID
- **Query efficiency**: Retrieve all keys for a partition at once

## Implementation Examples

### Combined Implementation

Many stores can implement multiple contracts:

```typescript
class DynamoDBStore implements
  PartitionedKeyReaderWriter,
  PartitionedKeyCounter {

  async getValue<T, P extends string>(
    key: CompoundKey<P, T>
  ): Promise<T | undefined> {
    const result = await this.dynamodb.getItem({
      TableName: key.namespace,
      Key: {
        PK: { S: key.partition },
        SK: { S: key.sort }
      }
    });
    return result.Item ? JSON.parse(result.Item.value.S) : undefined;
  }

  async setValue<T, P extends string>(
    key: CompoundKey<P, T>,
    data: T
  ): Promise<void> {
    await this.dynamodb.putItem({
      TableName: key.namespace,
      Item: {
        PK: { S: key.partition },
        SK: { S: key.sort },
        value: { S: JSON.stringify(data) }
      }
    });
  }

  async getCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    const result = await this.getValue<number, P>(id);
    return result;
  }

  async incrCounter<P extends string>(
    id: CompoundKey<P, number>,
    by: number = 1
  ): Promise<number | undefined> {
    const result = await this.dynamodb.updateItem({
      TableName: id.namespace,
      Key: {
        PK: { S: id.partition },
        SK: { S: id.sort }
      },
      UpdateExpression: 'ADD #val :incr',
      ExpressionAttributeNames: { '#val': 'value' },
      ExpressionAttributeValues: { ':incr': { N: by.toString() } },
      ReturnValues: 'UPDATED_NEW'
    });
    return result.Attributes?.value.N
      ? parseInt(result.Attributes.value.N, 10)
      : undefined;
  }

  async decrCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    return this.incrCounter(id, -1);
  }
}
```

### In-Memory Implementation for Testing

```typescript
class InMemoryStore implements
  PartitionedKeyReaderWriter,
  PartitionedKeyCounter,
  HealthCheck {

  private storage = new Map<string, any>();

  private buildKey<P extends string>(key: CompoundKey<P, any>): string {
    return `${key.namespace}:${key.partition}:${key.sort}`;
  }

  async healthCheck(): Promise<boolean> {
    return true; // In-memory store is always healthy
  }

  async getValue<T, P extends string>(
    key: CompoundKey<P, T>
  ): Promise<T | undefined> {
    return this.storage.get(this.buildKey(key));
  }

  async setValue<T, P extends string>(
    key: CompoundKey<P, T>,
    data: T
  ): Promise<void> {
    this.storage.set(this.buildKey(key), data);
  }

  async getCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    return this.storage.get(this.buildKey(id)) ?? 0;
  }

  async incrCounter<P extends string>(
    id: CompoundKey<P, number>,
    by: number = 1
  ): Promise<number | undefined> {
    const key = this.buildKey(id);
    const current = this.storage.get(key) ?? 0;
    const newValue = current + by;
    this.storage.set(key, newValue);
    return newValue;
  }

  async decrCounter<P extends string>(
    id: CompoundKey<P, number>
  ): Promise<number | undefined> {
    return this.incrCounter(id, -1);
  }

  clear() {
    this.storage.clear();
  }
}

// Use in tests
describe('UserService', () => {
  const store = new InMemoryStore();

  beforeEach(() => {
    store.clear();
  });

  it('should track user sessions', async () => {
    const sessionKey: CompoundKey<'user-123', number> = {
      partition: 'user-123',
      sort: 'session-count' as SortKey,
      namespace: 'sessions'
    };

    await store.incrCounter(sessionKey);
    await store.incrCounter(sessionKey);

    const count = await store.getCounter(sessionKey);
    expect(count).toBe(2);
  });
});
```

## Use Cases

### Rate Limiting

```typescript
async function checkRateLimit(
  userId: string,
  counter: PartitionedKeyCounter
): Promise<boolean> {
  const key: CompoundKey<string, number> = {
    partition: userId,
    sort: 'requests' as SortKey,
    namespace: 'rate-limits:hourly'
  };

  const count = await counter.incrCounter(key);
  return count !== undefined && count <= 1000;
}
```

### Feature Flags per User

```typescript
interface FeatureFlags {
  betaFeatures: boolean;
  darkMode: boolean;
}

async function getUserFlags(
  userId: string,
  store: PartitionedKeyReaderWriter
): Promise<FeatureFlags> {
  const key: CompoundKey<string, FeatureFlags> = {
    partition: userId,
    sort: 'feature-flags' as SortKey,
    namespace: 'user-settings'
  };

  const flags = await store.getValue(key);
  return flags ?? { betaFeatures: false, darkMode: false };
}
```

### Session Management

```typescript
interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

async function storeSession(
  sessionId: string,
  session: Session,
  store: PartitionedKeyReaderWriter
): Promise<void> {
  const key: CompoundKey<string, Session> = {
    partition: sessionId,
    sort: 'session-data' as SortKey,
    namespace: 'sessions'
  };

  await store.setValue(key, session);
}
```

## API Reference

### HealthCheck

```typescript
interface HealthCheck {
  healthCheck(): Promise<boolean>;
}
```

**Methods:**
- `healthCheck()` - Returns `true` if the service is healthy, `false` otherwise

### PartitionedKeyReaderWriter

```typescript
interface PartitionedKeyReaderWriter {
  getValue<T, P extends string>(key: CompoundKey<P, T>): Promise<T | undefined>;
  setValue<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void>;
}
```

**Methods:**
- `getValue<T, P>(key)` - Retrieves a value by key, returns `undefined` if not found
- `setValue<T, P>(key, data)` - Stores a value at the specified key

### PartitionedKeyCounter

```typescript
interface PartitionedKeyCounter {
  getCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined>;
  incrCounter<P extends string>(id: CompoundKey<P, number>, by?: number): Promise<number | undefined>;
  decrCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined>;
}
```

**Methods:**
- `getCounter<P>(id)` - Retrieves the current counter value
- `incrCounter<P>(id, by?)` - Atomically increments the counter by the specified amount (default: 1)
- `decrCounter<P>(id)` - Atomically decrements the counter by 1

## Type Safety Benefits

The contracts provide strong type safety:

```typescript
// Type inference works automatically
const userKey: CompoundKey<'user-123', UserPreferences> = {
  partition: 'user-123',
  sort: 'prefs' as SortKey,
  namespace: 'settings'
};

// TypeScript knows the return type
const prefs = await store.getValue(userKey); // UserPreferences | undefined

// Type errors are caught at compile time
const counterKey: CompoundKey<'user-123', number> = {
  partition: 'user-123',
  sort: 'count' as SortKey,
  namespace: 'counters'
};

// This would be a compile error:
// await store.setValue(counterKey, { foo: 'bar' });
// Error: Type '{ foo: string }' is not assignable to type 'number'
```

## License

MIT

## Author

Anton Kropp
