# CSV Module

A type-safe CSV processing library for Node.js that provides both file-based and streaming capabilities for reading and writing CSV data. Built on top of `csv-parser`, `csv-writer`, and `csv` packages with TypeScript support.

## Features

- Type-safe CSV reading and writing with full TypeScript generics support
- Streaming API for memory-efficient processing of large CSV files
- Automatic header generation from objects
- Custom header mapping support
- Flexible data transformation with mapper functions
- Date serialization options (ISO format by default)
- Both file path and stream-based operations

## Installation

This module is part of `@paradoxical-io/common-server` and requires the following peer dependencies:

```bash
npm install csv csv-parser csv-writer
```

## Usage

### Writing CSV Files

#### Simple CSV Generation

Convert an array of objects to a CSV string:

```typescript
import { toCsv } from './csv';

const data = [
  { name: 'Alice', age: 30, city: 'NYC' },
  { name: 'Bob', age: 25, city: 'LA' }
];

const csvString = await toCsv(data);
// Output:
// name,age,city
// Alice,30,NYC
// Bob,25,LA
```

#### Custom Headers

Map object keys to custom column names:

```typescript
import { toCsv } from './csv';

const data = [
  { firstName: 'Alice', emailAddress: 'alice@example.com' },
  { firstName: 'Bob', emailAddress: 'bob@example.com' }
];

const csvString = await toCsv(data, {
  firstName: 'First Name',
  emailAddress: 'Email Address'
});
// Output:
// First Name,Email Address
// Alice,alice@example.com
// Bob,bob@example.com
```

#### Handling Dates

Dates are automatically converted to ISO strings by default:

```typescript
import { toCsv } from './csv';

const data = [
  { event: 'Meeting', date: new Date('2025-01-15') }
];

// Default: converts dates to ISO format
const csvString = await toCsv(data);

// Disable date conversion
const csvStringRaw = await toCsv(data, undefined, { dateToISO: false });
```

### Streaming CSV Writing

For large datasets or real-time data, use the streaming API:

```typescript
import { CsvStreamWriter } from './csv';

interface SalesRecord {
  id: number;
  product: string;
  amount: number;
}

const writer = new CsvStreamWriter<SalesRecord>(
  { id: 'ID', product: 'Product', amount: 'Amount' }
);

// Pipe to HTTP response or file
writer.output().pipe(httpResponse);

// Push data incrementally
writer.push({ id: 1, product: 'Widget', amount: 100 });
writer.push({ id: 2, product: 'Gadget', amount: 200 });

// Signal completion
writer.close();
```

Handle errors in streaming:

```typescript
const writer = new CsvStreamWriter<SalesRecord>();

try {
  // ... fetch data from database
  writer.push(record);
} catch (err) {
  writer.error(err);
}
```

### Reading CSV Files

#### Basic CSV Reading

Read a CSV file with automatic header detection:

```typescript
import { CsvReader } from './csv';

interface User {
  name: string;
  email: string;
  age: string; // CSV values are strings by default
}

const reader = new CsvReader<User>();
const users = await reader.read('/path/to/users.csv');
// users: Array<{ name: string, email: string, age: string }>
```

#### Reading from Streams

Process CSV data from any readable stream:

```typescript
import { CsvReader } from './csv';
import { Readable } from 'stream';

const csvData = `name,email
Alice,alice@example.com
Bob,bob@example.com`;

const reader = new CsvReader<User>();
const users = await reader.read(Readable.from(csvData));
```

#### Type Transformation with Mappers

Convert string values to appropriate types:

```typescript
import { CsvReader } from './csv';

interface User {
  name: string;
  email: string;
  age: number;
  active: boolean;
}

const reader = new CsvReader<User>();
const users = await reader.read<User>('/path/to/users.csv', {
  mapper: (row) => ({
    name: row.name,
    email: row.email,
    age: Number(row.age),
    active: row.active === 'true'
  })
});
// users: Array<User> with proper types
```

#### Custom Headers

Specify column names explicitly when CSV lacks headers:

```typescript
import { CsvReader } from './csv';

interface Product {
  id: string;
  name: string;
  price: string;
}

const reader = new CsvReader<Product>();
const products = await reader.read('/path/to/products.csv', {
  keys: ['id', 'name', 'price'],
  skipHeader: false // No header in file
});
```

### Legacy API (Deprecated)

The `Csv` class provides file-based writing but is deprecated in favor of `toCsv`:

```typescript
import { Csv } from './csv';

interface User {
  name: string;
  email: string;
}

// Simple headers
const csv = new Csv<User>('/path/to/output.csv', ['name', 'email']);

// Custom headers
const csvWithTitles = new Csv<User>('/path/to/output.csv', [
  { id: 'name', title: 'Full Name' },
  { id: 'email', title: 'Email Address' }
]);

await csv.write([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
]);
```

Generate headers from objects automatically:

```typescript
import { Csv } from './csv';

const data = [
  { name: 'Alice', email: 'alice@example.com', age: 30 },
  { name: 'Bob', email: 'bob@example.com', role: 'admin' }
];

// Generates headers: name, email, age, role
const headers = Csv.headersFromObjects(data);
const csv = new Csv('/path/to/output.csv', headers);
await csv.write(data);
```

## API Reference

### Functions

#### `toCsv<T>(data: T[], headers?, opts?): Promise<string>`

Converts an array of objects to a CSV string.

- **data**: Array of objects to convert
- **headers**: Optional mapping of keys to column names
- **opts**: Options object with `dateToISO` (default: true)
- **Returns**: Promise resolving to CSV string

#### `toCsvStream<T>(headers?, opts?): stream.Transform`

Creates a Transform stream for CSV conversion.

- **headers**: Optional mapping of keys to column names
- **opts**: Options object with `dateToISO` (default: true)
- **Returns**: Node.js Transform stream

### Classes

#### `CsvStreamWriter<T>`

Streaming CSV writer for incremental data processing.

**Methods:**
- `output(): TypedReadable<CsvLine, T>` - Get the readable stream
- `push(data: T): void` - Write a record
- `close(): void` - Signal end of data
- `error(e: Error): void` - Emit an error

#### `CsvReader<T>`

Type-safe CSV reader with transformation support.

**Methods:**
- `read<Y, Z>(path, options?): Promise<Z[]>` - Read and parse CSV
  - **path**: File path (string) or ReadableStream
  - **options.keys**: Array of column names
  - **options.skipHeader**: Whether to skip first line (default: true)
  - **options.mapper**: Function to transform each row

#### `Csv<T>` (Deprecated)

Legacy class-based CSV writer.

**Methods:**
- `write(data: T[]): Promise<void>` - Write records to file
- `static headersFromObjects<T>(items: T[]): Array<CsvWriteHeader<T>>` - Generate headers

### Types

```typescript
interface CsvWriteHeader<T> {
  id: keyof T & string;
  title: string;
}

interface StreamableOptions {
  dateToISO?: boolean;
}

type CsvLine = Brand<string, 'CsvLine'>;
```

## Performance Considerations

- Use `toCsv` for small datasets that fit in memory
- Use `CsvStreamWriter` for large datasets or HTTP responses to minimize memory usage
- Use `mapper` functions in `CsvReader` for efficient type conversion during parsing
- Stream-based operations process data in chunks, making them suitable for large files

## TypeScript Support

This module provides full generic type support. The type parameter `T` represents your data model:

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
}

// Writer knows about Product fields
const writer = new CsvStreamWriter<Product>();

// Reader provides typed output
const reader = new CsvReader<Product>();
const products: Product[] = await reader.read('/path/to/products.csv', {
  mapper: (row) => ({
    id: Number(row.id),
    name: row.name,
    price: Number(row.price)
  })
});
```

## Dependencies

- `csv` - CSV stringification
- `csv-parser` - CSV parsing with streaming support
- `csv-writer` - Legacy CSV writing (deprecated usage)
- `@paradoxical-io/types` - Brand types for type safety
