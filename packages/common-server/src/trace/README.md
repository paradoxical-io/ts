# Trace Module

A lightweight distributed tracing module that provides continuation-local storage (CLS) for tracking request traces and user context across asynchronous operations in Node.js applications. Built on top of `cls-hooked`, this module ensures trace IDs and user context propagate automatically through promise chains, callbacks, and async/await operations.

## Features

- Automatic trace ID generation and propagation across async boundaries
- Hierarchical tracing with main trace and sub-trace IDs
- User context tracking (current user ID) throughout request lifecycle
- Optional custom context storage for additional metadata
- Zero-configuration setup for most use cases
- Thread-safe context isolation between concurrent requests
- Test-friendly with Jest integration support

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
# or
yarn add @paradoxical-io/common-server
```

## Core Concepts

### Trace Hierarchy

The module provides two levels of trace identification:

- **trace**: The main trace ID that ties multiple related operations together (e.g., an entire API request)
- **subTrace**: A unique identifier for a specific execution context within the main trace

### Context Isolation

Each call to `withNewTrace` creates an isolated context where trace IDs and user data are stored. This context automatically propagates through all asynchronous operations spawned within it, ensuring proper correlation even when handling multiple concurrent requests.

## Usage

### Basic Tracing

Create a traced context for your async operations:

```typescript
import { withNewTrace, traceID } from '@paradoxical-io/common-server/trace';

// Automatically generate a trace ID
const result = await withNewTrace(async () => {
  const { trace, subTrace } = traceID();
  console.log(`Processing with trace: ${trace}, subTrace: ${subTrace}`);

  // Trace IDs are automatically available in nested calls
  await someAsyncOperation();

  return { success: true };
});

// Use a specific trace ID (e.g., from an incoming request header)
const result = await withNewTrace(
  async () => {
    // Your business logic here
    return await processRequest();
  },
  'custom-trace-id-123'
);
```

### User Context Tracking

Track the current authenticated user throughout the request lifecycle:

```typescript
import { withNewTrace, setCurrentUserId, getCurrentUserId } from '@paradoxical-io/common-server/trace';

// In your authentication middleware
withNewTrace(async () => {
  const userId = await authenticateUser(token);
  setCurrentUserId(userId);

  // The user ID is now available in all nested async operations
  await processUserRequest();

  // In any nested function
  async function processUserRequest() {
    const currentUser = getCurrentUserId();
    console.log(`Processing request for user: ${currentUser}`);
  }
});
```

### Optional Context Data

Store additional metadata that propagates with the trace:

```typescript
import { withNewTrace, addToOptionalContext, getOptionalContext } from '@paradoxical-io/common-server/trace';

withNewTrace(
  async () => {
    // Add custom context during execution
    addToOptionalContext('requestPath', '/api/users');
    addToOptionalContext('method', 'POST');

    await handleRequest();
  },
  undefined,
  {
    // Initialize with context data
    clientIp: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  }
);

// Later in the call chain
function handleRequest() {
  const context = getOptionalContext();
  console.log('Request context:', context);
  // { clientIp: '192.168.1.1', userAgent: 'Mozilla/5.0', requestPath: '/api/users', method: 'POST' }
}
```

### Concurrent Request Handling

The module ensures proper trace isolation between concurrent requests:

```typescript
import { withNewTrace, traceID } from '@paradoxical-io/common-server/trace';

// Handle multiple requests concurrently
const [result1, result2] = await Promise.all([
  withNewTrace(async () => {
    const { trace } = traceID();
    console.log(`Request 1: ${trace}`); // Different trace
    return await processRequest1();
  }, 'trace-1'),

  withNewTrace(async () => {
    const { trace } = traceID();
    console.log(`Request 2: ${trace}`); // Different trace
    return await processRequest2();
  }, 'trace-2')
]);
```

### Express Middleware Example

Integrate with Express.js to trace HTTP requests:

```typescript
import { withNewTrace, setCurrentUserId, traceID } from '@paradoxical-io/common-server/trace';
import express from 'express';

const app = express();

// Tracing middleware
app.use((req, res, next) => {
  // Extract or generate trace ID from request headers
  const incomingTraceId = req.headers['x-trace-id'] as string;

  withNewTrace(
    () => {
      const { trace, subTrace } = traceID();

      // Add trace IDs to response headers
      res.setHeader('x-trace-id', trace);
      res.setHeader('x-subtrace-id', subTrace);

      // Store request metadata
      addToOptionalContext('path', req.path);
      addToOptionalContext('method', req.method);

      next();
    },
    incomingTraceId
  );
});

// Authentication middleware
app.use((req, res, next) => {
  const userId = extractUserFromToken(req.headers.authorization);
  if (userId) {
    setCurrentUserId(userId);
  }
  next();
});

// Route handler - trace context is automatically available
app.get('/api/users/:id', async (req, res) => {
  const { trace } = traceID();
  const currentUser = getCurrentUserId();

  console.log(`[${trace}] User ${currentUser} accessing /api/users/${req.params.id}`);

  const userData = await fetchUserData(req.params.id);
  res.json(userData);
});
```

### Testing with bindTrace

For testing scenarios where you need to bind a function to a trace context:

```typescript
import { bindTrace, withNewTrace, traceID } from '@paradoxical-io/common-server/trace';

test('function maintains trace context', () => {
  withNewTrace(() => {
    const originalTrace = traceID();

    // Bind a callback to the current trace context
    const callback = bindTrace(() => {
      const callbackTrace = traceID();
      expect(callbackTrace.trace).toBe(originalTrace.trace);
    });

    // Execute later - trace context is preserved
    setTimeout(callback, 100);
  });
});
```

## API Reference

### withNewTrace<T>(fun: () => T, trace?: string, optionalContext?: OptionalContext): T

Creates a new trace context for the provided function. All async operations within this function will inherit the trace context.

- **fun**: The function to execute within the trace context
- **trace**: Optional trace ID (auto-generated if not provided)
- **optionalContext**: Optional metadata to attach to the trace
- **Returns**: The return value of the provided function

### traceID(): Trace

Retrieves the current trace and subTrace IDs.

- **Returns**: Object containing `trace` and `subTrace` properties

### setCurrentUserId<T extends string>(userId: T): void

Sets the current user ID in the trace context.

- **userId**: The user identifier to store

### getCurrentUserId<T extends string>(): T | undefined

Retrieves the current user ID from the trace context.

- **Returns**: The current user ID or undefined if not set

### addToOptionalContext(key: string, value: string): void

Adds or updates a key-value pair in the optional context.

- **key**: The context key
- **value**: The context value

### getOptionalContext(): OptionalContext | undefined

Retrieves the current optional context object.

- **Returns**: Object containing all optional context key-value pairs

### bindTrace<F extends Function>(fn: F, context?: any): F

Binds a function to the current trace context (primarily for testing).

- **fn**: The function to bind
- **context**: Optional context to bind
- **Returns**: The bound function

## Types

```typescript
interface Trace {
  trace: string;
  subTrace?: string;
}

interface OptionalContext {
  [k: string]: string;
}
```

## Implementation Details

This module uses `cls-hooked` (Continuation-Local Storage) to maintain context across asynchronous operations. CLS works similarly to thread-local storage but for Node.js's event-driven architecture, ensuring that values set in a trace context remain accessible throughout the async call chain.

The module is Jest-aware and gracefully handles test environments where CLS might not be fully initialized, preventing errors during test execution.

## Best Practices

1. **Wrap at the entry point**: Call `withNewTrace` at the highest level of your request handling (e.g., middleware, event handlers)
2. **Propagate trace IDs**: Pass trace IDs to external services via headers or metadata
3. **Log with context**: Include trace IDs in all log statements for correlation
4. **Set user context early**: Call `setCurrentUserId` immediately after authentication
5. **Avoid trace nesting**: Don't create nested `withNewTrace` calls unless you specifically need separate trace contexts

## License

MIT
