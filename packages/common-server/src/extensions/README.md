# Extensions Module

A comprehensive utility library for working with Node.js streams, async iterators, and functional stream processing. This module provides type-safe helpers for common stream operations, pagination handling, and iterator transformations.

## Features

- Convert Node.js Readable streams to Buffers or typed arrays
- Transform paginated API responses into async iterators
- Functional stream operations (map, take, drop, group)
- Support for both synchronous and asynchronous iterators
- Type-safe stream interfaces with TypeScript generics
- Zero-copy efficient buffer handling

## Core Utilities

### Stream Conversion

Convert Node.js streams into more manageable data structures:

```typescript
import { Streams } from '@paradoxical-io/common-server/extensions';
import fs from 'fs';

// Convert a byte stream to a Buffer
const fileStream = fs.createReadStream('data.bin');
const buffer = await Streams.toBuffer(fileStream);

// Convert a typed stream to an array
const objectStream = createReadableStream(); // TypedReadable<User>
const users = await Streams.toArray(objectStream);
```

### Pagination as Async Iterator

Transform any paginated API into a streamable async iterator:

```typescript
import { Streams } from '@paradoxical-io/common-server/extensions';

// Example: Paginate through database results
interface DbResponse {
  nextToken?: string;
  items: User[];
}

const userStream = Streams.pagingAsyncIterator(
  undefined, // start page/token
  async (token) => await db.query({ nextToken: token }),
  (response) => {
    if (!response.items.length) return undefined;
    return [response.nextToken, response.items];
  }
);

// Consume the stream
for await (const user of userStream) {
  console.log(user);
}
```

### Stream Transformations

Process async iterators with functional operations:

```typescript
import { Streams } from '@paradoxical-io/common-server/extensions';

// Take only first N items
const firstTen = Streams.takeAsync(dataStream, 10);

// Group items into batches
const batched = Streams.grouped(dataStream, 100);
for await (const batch of batched) {
  await processBatch(batch); // Process 100 items at a time
}

// Transform stream data
const transformed = Streams.mapAsync(
  userStream,
  async (user) => await enrichUserData(user)
);

// Collect async iterator to array
const allUsers = await Streams.from(userStream);
```

### Synchronous Iterator Operations

Work with sync generators using familiar functional patterns:

```typescript
import { Streams } from '@paradoxical-io/common-server/extensions';

function* generateNumbers() {
  let i = 0;
  while (true) yield i++;
}

// Take first 10 numbers
const firstTen = [...Streams.take(generateNumbers(), 10)];
// [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

// Drop items while predicate is true
const afterFive = Streams.dropWhile(generateNumbers(), (n) => n < 5);
const next5 = [...Streams.take(afterFive, 5)];
// [5, 6, 7, 8, 9]

// Take items while predicate is true
const lessThanTen = Streams.takeWhile(generateNumbers(), (n) => n < 10);
const result = [...lessThanTen];
// [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

## API Reference

### Streams Class

#### Static Methods

**`toBuffer(readStream: Readable): Promise<Buffer>`**
- Reads a byte stream into a single Buffer
- Handles backpressure automatically
- Throws on stream errors

**`toArray<T>(readStream: TypedReadable<T>): Promise<T[]>`**
- Reads a typed object stream into an array
- Useful for collecting stream results
- Handles both 'end' and 'close' events

**`pagingAsyncIterator<Page, Result, Response>(start, next, extract): AsyncGenerator<Result>`**
- Converts paginated API calls into async iterator
- `start`: Initial page/token value
- `next`: Function to fetch next page
- `extract`: Function to extract [nextPage, results] from response

**`grouped<T>(iterator: AsyncGenerator<T>, size: number): AsyncGenerator<T[]>`**
- Groups async iterator items into fixed-size batches
- Yields arrays of specified size
- Last batch may be smaller

**`takeAsync<T>(iterator: AsyncGenerator<T>, size: number): AsyncGenerator<T>`**
- Takes first N items from async iterator
- Returns new async iterator

**`take<T>(iterator: Generator<T>, size: number): Generator<T>`**
- Takes first N items from sync iterator
- Returns new sync iterator

**`takeWhile<T>(iterator: Generator<T>, predicate: (d: T) => boolean): Generator<T>`**
- Takes items while predicate returns true
- Stops at first false result

**`dropWhile<T>(iterator: Generator<T>, predicate: (d: T) => boolean): Generator<T>`**
- Drops items while predicate returns true
- Yields remaining items

**`map<T, Y>(iterator: AsyncGenerator<T>, mapper: (data: T) => Y): AsyncGenerator<Y>`**
- Synchronously transforms async iterator values
- Mapper function executes synchronously

**`mapAsync<T, Y>(iterator: AsyncGenerator<T>, mapper: (data: T) => Promise<Y>): AsyncGenerator<Y>`**
- Asynchronously transforms async iterator values
- Awaits mapper function for each item

**`from<T>(iterator: AsyncGenerator<T>): Promise<T[]>`**
- Collects all async iterator values into array
- Awaits completion of iterator

## Type Definitions

### TypedReadable<T>
A Node.js Readable stream that pushes typed objects instead of buffers.

```typescript
type TypedReadable<T> = stream.Readable & { push(data: T): void };
```

### TypedTransformable<T>
A Node.js Transform stream that accepts typed objects.

```typescript
type TypedTransformable<T> = stream.Transform & { write(data: T): void };
```

## Usage Patterns

### Batch Processing with Pagination

```typescript
// Fetch all users in batches of 50
const allUsers = Streams.pagingAsyncIterator(
  0, // start page
  async (page) => await api.getUsers({ page, limit: 50 }),
  (response) => {
    if (response.users.length === 0) return undefined;
    return [page + 1, response.users];
  }
);

// Process in groups of 10
const batched = Streams.grouped(allUsers, 10);
for await (const batch of batched) {
  await processUserBatch(batch);
}
```

### Stream Processing Pipeline

```typescript
// Complex transformation pipeline
const results = await Streams.from(
  Streams.takeAsync(
    Streams.mapAsync(
      Streams.grouped(dataStream, 100),
      async (batch) => await processBatch(batch)
    ),
    10 // Take first 10 processed batches
  )
);
```

### Memory-Efficient File Processing

```typescript
import fs from 'fs';
import { Streams } from '@paradoxical-io/common-server/extensions';

// Read large file without loading into memory
const stream = fs.createReadStream('huge-file.bin');
const buffer = await Streams.toBuffer(stream); // Efficient concatenation
```

## Best Practices

1. **Use async iterators for I/O-bound operations**: They provide natural backpressure handling
2. **Batch operations with `grouped()`**: Process multiple items together for efficiency
3. **Use `take()` for testing**: Limit stream consumption during development
4. **Prefer `mapAsync()` for I/O transformations**: Maintains async flow control
5. **Handle errors**: Wrap stream operations in try-catch for robust error handling

## Dependencies

- Node.js built-in `stream` module
- TypeScript for type definitions

## License

MIT
