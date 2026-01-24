# @paradoxical-io/common-test

A comprehensive Jest testing utility library that provides type-safe mocking, custom matchers, and helpful test utilities for TypeScript projects. This package simplifies common testing patterns and enhances Jest's capabilities with improved type safety and developer ergonomics.

## Features

- **Type-safe mocking utilities** - Auto-generate mocks with full TypeScript support
- **Smart expect wrappers** - Enhanced type-safe assertions that catch errors at compile time
- **Custom Jest matchers** - Additional matchers for common testing scenarios
- **Environment mocking** - Utilities for testing different environment configurations
- **Timer utilities** - Auto-advance timers and retry mechanisms for async tests
- **Snapshot resolver** - Handle snapshots when running tests from compiled dist directory
- **Test file loader** - Simple JSON test fixture loading

## Installation

```bash
npm install --save-dev @paradoxical-io/common-test
# or
yarn add --dev @paradoxical-io/common-test
```

## Usage

### Type-Safe Mocking

Create fully typed mocks with automatic method stubbing:

```typescript
import { mock, mockMethod, asMocked } from '@paradoxical-io/common-test';

interface UserService {
  getUser(id: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// Auto-mock all methods
const userService = mock<UserService>();

// Configure mock behavior with full type safety
userService.getUser.mockResolvedValue({ id: '123', name: 'John' });

// Mock with default responses
const serviceWithDefaults = autoMockProxy<UserService>({ id: 'default-id' });

// Partially mock a single method on an existing object
const service = new RealUserService();
mockMethod(service, 'getUser');
asMocked(service).getUser.mockResolvedValue({ id: '456', name: 'Jane' });
```

### Safe Expect - Type-Safe Assertions

Get compile-time type checking for all your assertions:

```typescript
import { safeExpect, safeObjectContaining, deepSafeObjectContaining } from '@paradoxical-io/common-test';

// Full type safety - invalid comparisons caught at compile time
safeExpect(user.age).toBeGreaterThan(18);
safeExpect(users).toContainEqual({ id: '123', name: 'John' });
safeExpect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Partial object matching with type safety
safeExpect(response).toMatchObject(safeObjectContaining<Response>({ status: 200 }));

// Deep partial matching
safeExpect(complexObject).toEqual(
  deepSafeObjectContaining<ComplexType>({
    nested: { field: 'value' },
  })
);

// Match object excluding specific fields
safeExpect(user).toMatchObjectExcluding({ name: 'John', age: 30 }, ['createdAt', 'updatedAt']);

// Conditional negation
const shouldMatch = false;
safeExpect(value).negated(shouldMatch).toBeTruthy();
```

### Custom Jest Matchers

Extend Jest with additional matchers:

```typescript
import { extendJest } from '@paradoxical-io/common-test';

// Call once in your test setup file
extendJest();

// Use custom matchers
expect(5).toBeWithinRange(1, 10);
expect(someValue).logToCli(); // Debug utility for tests

// Error matching for structured errors
expect(error).matchesErrorWithCode({ code: 'USER_NOT_FOUND', data: { userId: '123' } });

expect(error).matchesUserFacingMessage({ code: 'ERROR', data: { userFacingMessage: 'Please try again' } });
```

### Environment Mocking

Test different environment configurations:

```typescript
import { useMockEnv, usingEnv } from '@paradoxical-io/common-test';

// Set environment for entire test
beforeEach(() => {
  useMockEnv('dev');
});

// Use environment for a single block
await usingEnv('prod', async () => {
  // Code here runs with PARADOX_ENV=prod
  const config = getConfig();
  expect(config.apiUrl).toBe('https://api.prod.example.com');
});
// Environment automatically restored after block
```

### Timer Utilities

Handle async code with built-in waits:

```typescript
import { autoAdvanceTimers, retry } from '@paradoxical-io/common-test';

// Auto-advance timers for code with internal waits
it(
  'handles retryDecorator logic',
  autoAdvanceTimers(async () => {
    jest.useFakeTimers();
    await functionWithInternalRetries();
    // Timers automatically advanced during execution
  })
);

// Retry flaky tests
it(
  'eventually succeeds',
  retry(3)(async () => {
    // Test code that might be flaky
    // Will retryDecorator up to 3 times before failing
    await someFlakeyOperation();
  })
);
```

### Test File Loading

Load JSON test fixtures:

```typescript
import { loadTestFile } from '@paradoxical-io/common-test';

interface TestData {
  users: User[];
  posts: Post[];
}

// Loads from __test__/fixtures.json relative to process.cwd()
const testData = loadTestFile<TestData>('fixtures.json');

// Specify custom root directory
const data = loadTestFile<TestData>('data.json', '/custom/path');
```

### Snapshot Resolver

Configure Jest to resolve snapshots from source when running compiled tests:

```javascript
// jest.config.js
module.exports = {
  snapshotResolver: require.resolve('@paradoxical-io/common-test/dist/jest/snapshotResolver.js'),
};
```

This allows snapshots to be stored in `src/` directories even when tests run from `dist/`.

### Custom Reporter

Add test start logging to your Jest configuration:

```javascript
// jest.config.js
module.exports = {
  reporters: ['default', require.resolve('@paradoxical-io/common-test/dist/jest/reporter.js')],
};
```

## API Reference

### Mocking Functions

- `mock<T>()` - Create a fully mocked object with all methods stubbed
- `autoMockProxy<T>(defaultResponse?)` - Create a mock with optional default return value
- `mockMethod<T>(root, method, resetIfExists?)` - Mock a single method on an object
- `asMocked<T>(item)` - Type assertion helper for mocked objects

### Type-Safe Expectations

- `safeExpect<T>(item)` - Create type-safe expectation wrapper
- `safeObjectContaining<T>(partial)` - Type-safe object matcher
- `deepSafeObjectContaining<T>(partial)` - Deep partial object matcher
- `safePartial<T>(partial)` - Cast deep partial to full type for test data construction

### Custom Matchers

- `toBeWithinRange(floor, ceiling)` - Assert number is within range
- `logToCli()` - Debug log to console in tests
- `matchesErrorWithCode(error, opts?)` - Match structured error objects
- `matchesUserFacingMessage(error)` - Match user-facing error messages
- `matchesNotImplementedError(error)` - Match NotImplementedError instances

### Environment Utilities

- `useMockEnv(env)` - Set PARADOX_ENV to 'local', 'dev', or 'prod'
- `usingEnv(env, block)` - Execute block with temporary environment, then restore

### Test Utilities

- `loadTestFile<T>(file, root?)` - Load JSON file from **test** directory
- `autoAdvanceTimers<T>(callback)` - Auto-advance Jest fake timers during async execution
- `retry(times)` - Retry test function multiple times before failing

## TypeScript Support

This package is written in TypeScript and provides full type definitions. All utilities are designed to maximize type safety and catch errors at compile time rather than runtime.

## License

MIT
