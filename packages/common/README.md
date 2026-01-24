# @paradoxical-io/common

A comprehensive TypeScript utility library providing common functionality for JavaScript/TypeScript projects. This package offers well-tested utilities for date/time operations, promise management, data transformations, probability calculations, and much more.

## Features

- **DateTime Operations**: Time unit conversions, calendar date handling, timezone support, and ISO date string parsing
- **Promise Utilities**: Rate limiting, caching, timeouts, and retry logic for async operations
- **Type Extensions**: Enhanced array, object, string, map, set, and math operations with type safety
- **Dependency Injection**: Deferred dependencies and cycle management for breaking circular dependencies
- **PubSub System**: Type-safe in-memory publish-subscribe pattern implementation
- **Text Processing**: String formatting, amount formatting, emoji handling, and text manipulation
- **Probability Tools**: Weighted random selection and percentage-based chance calculations
- **XPath Builder**: Type-safe XPath construction for object navigation
- **Error Handling**: Structured error types and serialization utilities
- **Code Generation**: Random code generation utilities

## Installation

```bash
npm install @paradoxical-io/common
```

or

```bash
yarn add @paradoxical-io/common
```

## Usage Examples

### DateTime Conversions

```typescript
import { asMilli, asSeconds, isoDateStringToEpoch, epochNow } from '@paradoxical-io/common';

// Convert time units
const fiveMinutesInMs = asMilli(5, 'minutes'); // 300000
const oneDayInSeconds = asSeconds(1, 'days'); // 86400

// Convert ISO date strings to epochs with timezone support
const epoch = isoDateStringToEpoch('2023-08-31' as ISODateString, 'America/New_York');

// Get current time
const now = epochNow();
```

### Promise Rate Limiting

```typescript
import { Limiter } from '@paradoxical-io/common';

// Create a limiter that allows max 5 concurrent operations
const limiter = new Limiter({ maxConcurrent: 5 });

// Wrap promises to enforce rate limiting
const results = await Promise.all([
  limiter.wrap(() => fetchUser(1)),
  limiter.wrap(() => fetchUser(2)),
  limiter.wrap(() => fetchUser(3)),
  // Only 5 will run concurrently
]);

await limiter.close(); // Wait for all operations to complete
```

### Promise Caching with Expiration

```typescript
import { expiring, asMilli } from '@paradoxical-io/common';

// Cache expensive operations with TTL
const cachedData = expiring(
  () => expensiveApiCall(),
  asMilli(5, 'minutes') // Cache for 5 minutes
);

const data1 = cachedData.get(); // Calls expensiveApiCall()
const data2 = cachedData.get(); // Returns cached value
```

### Array Extensions

```typescript
import { shuffleArray, columnFlatten, Arrays } from '@paradoxical-io/common';

// Fisher-Yates shuffle
const shuffled = shuffleArray([1, 2, 3, 4, 5]);

// Flatten 2D array by columns
const flattened = columnFlatten([
  [0, 1],
  [2, 3],
]); // [0, 2, 1, 3]

// Group array into chunks
const grouped = Arrays.grouped([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Get random item
const random = Arrays.random([1, 2, 3, 4]);
```

### Type-Safe PubSub

```typescript
import { PubSub } from '@paradoxical-io/common';

type Event = { type: 'user.created'; userId: string } | { type: 'user.deleted'; userId: string };

const pubsub = new PubSub<Event>();

// Subscribe to specific event types
pubsub.subscribe('user.created', event => {
  console.log(`User created: ${event.userId}`);
});

// Publish events
await pubsub.publish({ type: 'user.created', userId: '123' });
```

### String and Text Utilities

```typescript
import { leftPad, truncate, camelCase, titleCase, formatAmount } from '@paradoxical-io/common';

// Pad strings
const padded = leftPad(42, 5, '0'); // "00042"

// Truncate long text
const short = truncate('Very long string here', 10); // "Very long ...21"

// Case conversions
const camel = camelCase('hello-world'); // "helloWorld"
const title = titleCase('hello-world'); // "Hello World"

// Format currency amounts
const formatted = formatAmount({
  amount: 1234.56 as Amount,
  includeCommas: true,
  includeDollarSign: true,
}); // "$1,234.56"
```

### Object Utilities

```typescript
import { pruneUndefined, keysOf, SafeJson } from '@paradoxical-io/common';

// Remove undefined values from objects
const cleaned = pruneUndefined({ a: 1, b: undefined, c: 3 }); // { a: 1, c: 3 }

// Type-safe object key iteration
const obj = { name: 'John', age: 30 };
const keys = keysOf(obj); // Array<'name' | 'age'>

// Safe JSON stringification (no functions allowed)
const json = SafeJson.stringify({ data: 'value' });
```

### Probability and Chance

```typescript
import { chance, roll } from '@paradoxical-io/common';

// 70% chance of returning true
if (chance({ percentage: 70 })) {
  console.log('Lucky!');
}

// Roll a random number (0-100)
const rollValue = roll({ scale: 100 });

// Use custom hasher for deterministic results
import seedrandom from 'seedrandom';
const rng = seedrandom('seed-value');
const deterministic = chance({ percentage: 50, hasher: rng });
```

### XPath Builder (Type-Safe Object Navigation)

```typescript
import { xpath } from '@paradoxical-io/common';

interface User {
  profile: {
    name: string;
    addresses: Array<{ city: string }>;
  };
}

const path = xpath<User>().field('profile').field('addresses').index(0).field('city');

console.log(path.path); // "$.profile.addresses[0].city"
```

### Dependency Injection with Deferred

```typescript
import { withCycles } from '@paradoxical-io/common';

// Break circular dependencies safely
const container = withCycles(manager => {
  const serviceA = manager.newDeferral<ServiceA>('ServiceA');
  const serviceB = new ServiceB(serviceA);

  serviceA.set(new ServiceA(serviceB));

  return { serviceA, serviceB };
});
// Auto-verifies all deferred dependencies are resolved
```

### Retry Logic

```typescript
import { Retrier } from '@paradoxical-io/common';

// Try once fast, then retryDecorator in background if fails
await Retrier.tryFast(
  () => unreliableApiCall(),
  error => console.error('Failed after retries:', error),
  () => console.log('Success!'),
  { retries: 3, minTimeout: 1000 }
);
```

## Module Organization

The package is organized into focused modules:

- **code**: Code generation utilities
- **datetime**: Time conversions, calendar operations, time providers
- **di**: Dependency injection and deferred dependencies
- **errors**: Custom error types and serialization
- **extensions**: Enhanced array, object, string, map, set, boolean, and math operations
- **metrics**: HTTP metrics and monitoring integrations
- **name**: Name matching utilities
- **probability**: Chance calculations and probabilistic selection
- **promise**: Promise caching, rate limiting, and timeout utilities
- **pubsub**: Type-safe publish-subscribe system
- **utils**: General utilities including retry logic, text formatting, email validation, ID generation
- **xpath**: Type-safe XPath builder for object navigation

## Dependencies

This package has minimal runtime dependencies:

- `date-fns` and `date-fns-tz` for date/time operations
- `bottleneck` for rate limiting
- `async-retry` for retry logic
- `uuid` for unique ID generation
- Standard utility libraries (lodash, etc.)

## TypeScript Support

Fully typed with TypeScript. All exports include complete type definitions for excellent IDE support and type safety.

## License

MIT
