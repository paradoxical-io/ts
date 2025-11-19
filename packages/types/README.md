# @paradoxical-io/types

A comprehensive TypeScript utility library providing branded types, nullability helpers, error handling utilities, and type-safe primitives for building robust applications. This package offers compile-time guarantees through phantom types (brands) and exhaustiveness checking, along with runtime utilities for common patterns.

## Features

- **Branded Types**: Create compile-time type-safe wrappers around primitives (newtype pattern)
- **Nullability Utilities**: Type guards and helpers for handling null/undefined values
- **Error Handling**: Structured error types with codes mapped to HTTP status codes
- **Exhaustiveness Checking**: Compile-time switch statement completeness verification
- **Date/Time Types**: Branded types for epochs, ISO strings, and time ranges
- **Type Utilities**: Advanced TypeScript utilities for property extraction, flattening, and union subsets
- **Key Types**: Type-safe cache and compound key structures
- **JSON Types**: Recursive type-safe JSON value definitions

## Installation

```bash
npm install @paradoxical-io/types
# or
yarn add @paradoxical-io/types
```

## Usage

### Branded Types

Create type-safe wrappers around primitives to prevent accidental misuse:

```typescript
import { Brand, SubBrand, asBrandSafe } from '@paradoxical-io/types';

// Define branded types
type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type FirstName = Brand<string, 'FirstName'>;
type Name = Brand<string, 'Name'>;

// Type safety: these are not interchangeable!
const userId: UserId = 'user-123' as UserId;
const email: Email = 'user@example.com' as Email;

// This would be a compile error:
// const wrongId: UserId = email;

// Create sub-brands (FirstName is a type of Name)
type FirstNameBrand = SubBrand<Name, 'FirstName'>;

// Safely cast nullable values to branded types
const maybeName: string | undefined = getSomeName();
const brandedName: FirstName | undefined = asBrandSafe<FirstName, string>(maybeName);
// Returns undefined if input is null/undefined, otherwise returns branded value
```

### Nullability Helpers

Type-safe null/undefined checking and handling:

```typescript
import {
  nullOrUndefined,
  notNullOrUndefined,
  nullishToUndefined,
  NonNullableAll
} from '@paradoxical-io/types';

const value: string | null | undefined = getValue();

// Type guard: narrows to null | undefined
if (nullOrUndefined(value)) {
  console.log('Value is nullish');
}

// Type guard: narrows to string
if (notNullOrUndefined(value)) {
  console.log(value.toUpperCase()); // Safe to use
}

// Convert null to undefined (useful for APIs that don't accept null)
const normalized: string | undefined = nullishToUndefined(value);

// Make all properties of a type non-nullable
interface User {
  name?: string;
  email?: string | null;
}

type RequiredUser = NonNullableAll<User>;
// { name: string; email: string }
```

### Error Handling

Structured errors with type-safe error codes:

```typescript
import { ErrorWithCode, ErrorCode, ErrorPayload, isErrorWithCode } from '@paradoxical-io/types';

// Define custom error data
interface ValidationErrorData {
  field: string;
  constraint: string;
}

// Throw structured errors
throw new ErrorWithCode<ValidationErrorData>(
  ErrorCode.Invalid, // Maps to HTTP 400
  {
    data: { field: 'email', constraint: 'must be valid email' },
    errorMessage: 'Validation failed',
    userFacingMessage: 'Please check your input' as UserFacingMessage
  }
);

// Handle errors with type checking
try {
  await someOperation();
} catch (error) {
  if (isErrorWithCode<ValidationErrorData>(error)) {
    console.log(`Field ${error.data?.data?.field} failed validation`);
    console.log(`Error code: ${error.code}`); // ErrorCode.Invalid
  }
}

// Available error codes (with HTTP mappings):
// - ErrorCode.ItemNotFound (404)
// - ErrorCode.ItemAlreadyExists (409)
// - ErrorCode.Invalid (400)
// - ErrorCode.Locked (423)
// - ErrorCode.RateExceeded (429)
// - ErrorCode.NotAllowed (403)
// - ErrorCode.PreconditionRequired (428)
```

### Exhaustiveness Checking

Ensure all cases are handled in switch statements at compile time:

```typescript
import { bottom } from '@paradoxical-io/types';

type Status = 'pending' | 'approved' | 'rejected';

function handleStatus(status: Status): string {
  switch (status) {
    case 'pending':
      return 'Waiting for approval';
    case 'approved':
      return 'Request approved';
    case 'rejected':
      return 'Request rejected';
    default:
      // TypeScript error if any case is missing!
      return bottom(status);
  }
}

// With fallback handler
function handleStatusWithDefault(status: Status): string {
  switch (status) {
    case 'pending':
      return 'Waiting';
    case 'approved':
      return 'Approved';
    default:
      // Provide fallback if exhaustiveness not guaranteed
      return bottom(status, (unknownStatus) => `Unknown: ${unknownStatus}`);
  }
}
```

### Date and Time Types

Branded types for type-safe date/time handling:

```typescript
import {
  EpochMS,
  EpochSeconds,
  ISODateString,
  TimeRange,
  epochSecondsToEpochMS,
  parseTimeRange,
  Milliseconds,
  Seconds,
  Minutes
} from '@paradoxical-io/types';

// Type-safe epoch times
const now: EpochMS = Date.now() as EpochMS;
const unixTime: EpochSeconds = 1234567890 as EpochSeconds;

// Convert between time units with type safety
const nowMs: EpochMS = epochSecondsToEpochMS(unixTime);

// Time ranges
const range: TimeRange = {
  start: (Date.now() - 86400000) as EpochMS,
  end: Date.now() as EpochMS
};

// Parse time ranges from strings
const parsedRange: TimeRange | undefined = parseTimeRange({
  from: '2024-01-01',
  to: '2024-12-31'
});

// Duration types
const delay: Milliseconds = 1000 as Milliseconds;
const timeout: Seconds = 30 as Seconds;
const interval: Minutes = 5 as Minutes;
```

### Type Utilities

Advanced TypeScript type manipulation helpers:

```typescript
import { PropType, Extends, Flatten, RequireAtLeastOne } from '@paradoxical-io/types';

interface User {
  profile: {
    name: string;
    age: number;
  };
  email: string;
}

// Extract property type
type ProfileType = PropType<User, 'profile'>;
// { name: string; age: number }

// Flatten nested properties
type FlatProfile = Flatten<User, 'profile'>;
// { name: string; age: number }

// Enforce subset of union types
type Animal = 'dog' | 'cat' | 'bird';
type Pet = Extends<Animal, 'dog' | 'cat'>; // Valid
// type Invalid = Extends<Animal, 'dog' | 'fish'>; // Compile error!

// Require at least one property
interface SearchParams {
  name?: string;
  email?: string;
  phone?: string;
}

type ValidSearch = RequireAtLeastOne<SearchParams>;
// Must have at least one of: name, email, or phone
```

### Cache and Compound Keys

Type-safe key structures for caching and data stores:

```typescript
import { CacheKey, CompoundKey, SortKey } from '@paradoxical-io/types';

// Simple cache keys
interface UserCache {
  id: string;
  name: string;
}

const userKey: CacheKey<UserCache> = {
  key: 'user:123',
  namespace: 'users'
};

// Compound keys for partitioned data stores (like DynamoDB)
type UserId = string;
interface UserPreferences {
  theme: string;
  language: string;
}

const preferencesKey: CompoundKey<UserId, UserPreferences> = {
  partition: 'user-456' as UserId,
  sort: 'preferences' as SortKey,
  namespace: 'user-data'
};
```

### JSON Types

Type-safe recursive JSON definitions:

```typescript
import { JsonValue, JsonObject, JsonArray } from '@paradoxical-io/types';

// Ensure data is JSON-serializable
function saveToStorage(data: JsonValue): void {
  localStorage.setItem('data', JSON.stringify(data));
}

const validData: JsonObject = {
  name: 'John',
  age: 30,
  tags: ['developer', 'typescript'],
  metadata: {
    created: '2024-01-01',
    updated: null
  }
};

saveToStorage(validData); // Type-safe!

// This would be a compile error:
// saveToStorage({ func: () => {} }); // Functions not allowed
```

## API

### Brands
- `Brand<K, T>`: Create branded type from base type K with brand T
- `SubBrand<T, Y>`: Create sub-brand from existing brand
- `asBrandSafe<B, K>()`: Safely cast to brand, returning undefined for null/undefined

### Nullability
- `nullOrUndefined()`: Type guard for null or undefined
- `notNullOrUndefined()`: Type guard for non-nullish values
- `nullishToUndefined()`: Convert null to undefined
- `NonNullableAll<T>`: Make all properties non-nullable

### Errors
- `ErrorWithCode`: Structured error class with error codes
- `ErrorCode`: Enum of standard error codes (maps to HTTP status)
- `isErrorWithCode()`: Type guard for ErrorWithCode

### Exhaustiveness
- `bottom()`: Compile-time exhaustiveness checking for switch statements

### Dates
- `EpochMS`, `EpochSeconds`: Branded epoch types
- `ISODateString`, `YearMonthDayString`: Branded date string types
- `TimeRange`: Start/end time range interface
- `epochSecondsToEpochMS()`: Convert epoch seconds to milliseconds

### Types
- `PropType<T, K>`: Extract property type
- `Extends<T, U>`: Enforce union subset
- `Flatten<T, K>`: Flatten nested property
- `RequireAtLeastOne<T>`: Require at least one property
- `NoFunction<T>`: Exclude function types

### Keys
- `CacheKey<T>`: Generic cache key structure
- `CompoundKey<P, V>`: Partitioned key-value structure
- `SortKey`: Branded sort key type

### Other Types
- `Envelope<T>`: HTTP response envelope with error handling
- `DoOnceResponse<T>`: Type for idempotent operation responses
- `Email`, `PublicKey`, `PrivateKey`: Common branded primitive types

## License

MIT