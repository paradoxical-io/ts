# Cache

A type-safe, abstract caching interface that provides a consistent API for implementing various caching strategies. This interface is designed to be implementation-agnostic, allowing you to build cache adapters for Redis, Memcached, in-memory caches, or any other caching backend while maintaining type safety and a uniform API.

## Features

- **Type-safe cache keys**: Uses `CacheKey<T>` to ensure compile-time type checking of cached values
- **Flexible TTL support**: Optional time-to-live configuration with millisecond precision
- **Batch operations**: Efficient multi-get operations for fetching multiple keys at once
- **Atomic operations**: Built-in increment support for counters
- **Resource cleanup**: Explicit close method for graceful connection cleanup
- **Generic interface**: Works with any data type that TypeScript can serialize

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server @paradoxical-io/types
# or
yarn add @paradoxical-io/common-server @paradoxical-io/types
```

## Usage

### Implementing a Cache

The `Cache` interface defines the contract that all cache implementations must follow. Here's an example of implementing an in-memory cache:

```typescript
import { Cache } from '@paradoxical-io/common-server';
import { CacheKey, Milliseconds } from '@paradoxical-io/types';

class InMemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiry?: number }>();

  async get<T>(key: CacheKey<T>): Promise<T | undefined> {
    const cacheKey = this.buildKey(key);
    const entry = this.store.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      await this.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: CacheKey<T>, value: T, ttl?: Milliseconds): Promise<void> {
    const cacheKey = this.buildKey(key);
    const expiry = ttl ? Date.now() + ttl : undefined;
    this.store.set(cacheKey, { value, expiry });
  }

  async delete<T>(key: CacheKey<T>): Promise<void> {
    const cacheKey = this.buildKey(key);
    this.store.delete(cacheKey);
  }

  async increment(key: CacheKey<number>): Promise<number> {
    const current = await this.get(key);
    const newValue = (current ?? 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async multiGet<T>(keys: Array<CacheKey<T>>): Promise<Map<CacheKey<T>, T>> {
    const results = new Map<CacheKey<T>, T>();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  async close(): Promise<void> {
    this.store.clear();
  }

  private buildKey<T>(key: CacheKey<T>): string {
    return key.namespace ? `${key.namespace}:${key.key}` : key.key;
  }
}
```

### Using a Cache Implementation

Once you have a cache implementation, you can use it with full type safety:

```typescript
import { CacheKey, Milliseconds } from '@paradoxical-io/types';

// Define your data structures
interface User {
  id: string;
  name: string;
  email: string;
}

interface SessionData {
  userId: string;
  token: string;
  expiresAt: number;
}

// Create the cache
const cache = new InMemoryCache();

// Cache keys are type-safe
const userKey: CacheKey<User> = {
  key: 'user:123',
  namespace: 'users'
};

const sessionKey: CacheKey<SessionData> = {
  key: 'session:abc',
  namespace: 'sessions'
};

// Set values with optional TTL
await cache.set(userKey, {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});

// Set with 1 hour TTL
const oneHour = 3600000 as Milliseconds;
await cache.set(sessionKey, {
  userId: '123',
  token: 'abc-def-ghi',
  expiresAt: Date.now() + oneHour
}, oneHour);

// Get returns the correct type
const user = await cache.get(userKey); // Type: User | undefined
if (user) {
  console.log(user.name); // TypeScript knows this is a string
}

// Batch get multiple keys
const userKeys: Array<CacheKey<User>> = [
  { key: 'user:123', namespace: 'users' },
  { key: 'user:456', namespace: 'users' },
  { key: 'user:789', namespace: 'users' }
];

const users = await cache.multiGet(userKeys);
users.forEach((user, key) => {
  console.log(`User ${key.key}: ${user.name}`);
});

// Increment counters
const counterKey: CacheKey<number> = {
  key: 'page-views',
  namespace: 'analytics'
};

const views = await cache.increment(counterKey);
console.log(`Page views: ${views}`);

// Cleanup when done
await cache.close();
```

### Advanced Patterns

**Namespacing for Multi-Tenancy**

```typescript
function getUserCache(tenantId: string): CacheKey<User> {
  return {
    key: `user:${userId}`,
    namespace: `tenant:${tenantId}`
  };
}

const tenant1User = await cache.get(getUserCache('tenant-1'));
const tenant2User = await cache.get(getUserCache('tenant-2'));
```

**Cache-Aside Pattern**

```typescript
async function getUser(userId: string, db: Database): Promise<User> {
  const key: CacheKey<User> = {
    key: `user:${userId}`,
    namespace: 'users'
  };

  // Try cache first
  let user = await cache.get(key);

  if (!user) {
    // Cache miss - fetch from database
    user = await db.users.findById(userId);

    if (user) {
      // Populate cache for next time
      const fiveMinutes = 300000 as Milliseconds;
      await cache.set(key, user, fiveMinutes);
    }
  }

  return user;
}
```

**Distributed Counters**

```typescript
async function trackEvent(eventName: string): Promise<void> {
  const key: CacheKey<number> = {
    key: eventName,
    namespace: 'events'
  };

  const count = await cache.increment(key);

  if (count % 1000 === 0) {
    console.log(`Event ${eventName} reached ${count} occurrences`);
  }
}
```

## API

### `get<T>(key: CacheKey<T>): Promise<T | undefined>`

Retrieves a value from the cache. Returns `undefined` if the key doesn't exist or has expired.

- **Type parameter**: `T` - The type of the cached value
- **Parameter**: `key` - The cache key with type information
- **Returns**: The cached value or `undefined`

### `set<T>(key: CacheKey<T>, value: T, ttl?: Milliseconds): Promise<void>`

Stores a value in the cache with an optional time-to-live.

- **Type parameter**: `T` - The type of the value being cached
- **Parameter**: `key` - The cache key with type information
- **Parameter**: `value` - The value to cache
- **Parameter**: `ttl` - Optional time-to-live in milliseconds
- **Returns**: Promise that resolves when the value is stored

### `delete<T>(key: CacheKey<T>): Promise<void>`

Removes a key from the cache.

- **Type parameter**: `T` - The type of the cached value
- **Parameter**: `key` - The cache key to delete
- **Returns**: Promise that resolves when the key is deleted

### `increment(key: CacheKey<number>): Promise<number>`

Atomically increments a numeric value in the cache. If the key doesn't exist, it's initialized to 0 before incrementing.

- **Parameter**: `key` - The cache key for a numeric value
- **Returns**: The new value after incrementing

### `multiGet<T>(keys: Array<CacheKey<T>>): Promise<Map<CacheKey<T>, T>>`

Efficiently retrieves multiple values from the cache in a single operation.

- **Type parameter**: `T` - The type of the cached values
- **Parameter**: `keys` - Array of cache keys to retrieve
- **Returns**: Map of keys to their cached values (only includes keys that exist)

### `close(): Promise<void>`

Closes the cache connection and performs any necessary cleanup. Always call this method when shutting down your application.

- **Returns**: Promise that resolves when cleanup is complete

## Type Safety

The `CacheKey<T>` type ensures that:

1. Values stored with a key must match the key's type parameter
2. Values retrieved with a key are automatically typed
3. The compiler catches type mismatches at build time

```typescript
const userKey: CacheKey<User> = { key: 'user:1', namespace: 'users' };

// Correct - types match
await cache.set(userKey, { id: '1', name: 'Alice', email: 'alice@example.com' });

// Compile error - SessionData doesn't match User type
await cache.set(userKey, { userId: '1', token: 'xyz' }); // ❌ Type error!
```

## Best Practices

1. **Always use namespaces** to avoid key collisions, especially in shared cache environments
2. **Set appropriate TTLs** to prevent stale data and manage memory usage
3. **Handle cache misses gracefully** - the cache should be a performance optimization, not a single point of failure
4. **Close connections** when shutting down to prevent resource leaks
5. **Use batch operations** (multiGet) when fetching multiple keys to reduce network overhead
6. **Consider serialization** - ensure your cached types can be serialized/deserialized correctly

## Implementation Examples

Common cache backends you might implement this interface for:

- **Redis**: High-performance distributed cache
- **Memcached**: Simple distributed memory caching
- **LRU Cache**: In-memory cache with automatic eviction
- **DynamoDB**: Using TTL attributes for caching
- **Local Storage**: Browser-based caching
- **File System**: Persistent local caching

Each implementation should handle serialization, TTL management, and connection pooling according to the backend's capabilities.
