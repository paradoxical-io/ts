# Logger Module

A production-ready logging system built on Winston with support for structured logging, automatic redaction of sensitive data, method decorators for automatic logging, and integration with distributed tracing and metrics.

## Features

- **Structured Logging**: JSON-formatted logs with context propagation via CLS (continuation-local storage)
- **Automatic Sensitive Data Redaction**: Built-in protection for passwords, SSNs, credit cards, and other sensitive fields
- **Method Decorators**: Automatic logging of method calls, arguments, timing, and results with TypeScript decorators
- **Distributed Tracing**: Automatic trace ID and sub-trace ID injection for request tracking
- **Metrics Integration**: Built-in metrics emission for log levels and method performance
- **Flexible Configuration**: Environment-based configuration with multiple output formats
- **Type-Safe**: Full TypeScript support with branded types for critical log levels

## Installation

This module is part of `@paradoxical-io/common-server` and depends on:

```bash
npm install winston serialize-error lru-cache reflect-metadata
```

## Usage

### Basic Logging

```typescript
import { log } from '@paradoxical-io/common-server/logger';

// Simple logging at different levels
log.info('User logged in successfully');
log.warn('Cache miss detected');
log.error('Failed to connect to database', error);
log.debug('Processing request payload');
```

### Contextual Logging

Add structured context that persists across log statements:

```typescript
import { log } from '@paradoxical-io/common-server/logger';

// Create a logger with context
const userLogger = log.with({
  userId: '12345',
  requestId: 'abc-def-ghi'
});

userLogger.info('Starting user operation');
// Output: "Starting user operation userId=12345, requestId=abc-def-ghi"

userLogger.error('Operation failed');
// Output: "Operation failed userId=12345, requestId=abc-def-ghi"
```

### Method Logging with Decorators

Automatically log method calls, timing, and results:

```typescript
import { logMethod, sensitive } from '@paradoxical-io/common-server/logger';

class UserService {
  // Basic method logging
  @logMethod()
  async createUser(email: string, name: string) {
    // Implementation
  }

  // Redact sensitive parameters
  @logMethod()
  async authenticate(
    username: string,
    @sensitive() password: string
  ) {
    // password will be redacted in logs
  }

  // Partial redaction - only redact specific fields
  @logMethod()
  async updateProfile(
    @sensitive<UserProfile>({ keys: ['ssn', 'creditCard'] })
    profile: UserProfile
  ) {
    // Only ssn and creditCard fields will be redacted
  }

  // Log method results
  @logMethod({ logResult: true })
  async getUserById(id: string): Promise<User> {
    // Result will be logged
    return user;
  }

  // Enable timing metrics
  @logMethod({ enableMetrics: true })
  async expensiveOperation() {
    // Logs execution time
  }

  // Sample logs (e.g., 10% in prod)
  @logMethod({ sample: { prod: 10, dev: 100 } })
  async highVolumeOperation() {
    // Only 10% of calls logged in production
  }
}
```

### Sensitive Data Redaction

Automatic redaction of sensitive fields:

```typescript
import { redact, redactKey } from '@paradoxical-io/common-server/logger';

const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123',
  ssn: '123-45-6789',
  cardNumber: '4111111111111111'
};

// Auto-redacts password, ssn, cardNumber, and other sensitive fields
const safe = redact(userData);
// Output: { name: 'John Doe', email: 'john@example.com', password: '<redacted>', ... }

// Redact specific keys only
const partiallyRedacted = redact(userData, {
  keys: ['password']
});

// Redact by field name globally (deep)
const globalRedacted = redact(userData, {
  fieldNames: ['email']
});
```

Auto-redacted field names include:
- password
- ssn, socialSecurityNumber
- cardNumber, pan, pin, pinNumber
- taxId
- photos

### Advanced Features

#### One-Time Logging

Log a message only once (useful for deprecation warnings):

```typescript
// Will only log the first time
for (let i = 0; i < 1000; i++) {
  log.once('This API endpoint is deprecated');
}
```

#### Alarms

Create alertable log entries (e.g., for DataDog monitors):

```typescript
import { AlertableLog } from '@paradoxical-io/common-server/logger';

log.alarm('Critical: Payment processor unavailable' as AlertableLog);
```

#### Metrics Logging

Log structured metrics without sending to StatsD:

```typescript
log.metrics('Database query completed',
  { latencyMS: 150 },
  { queryType: 'select', table: 'users' }
);
```

#### Quiet Mode

Suppress logs except errors (useful for CLI tools):

```typescript
log.quiet('simple'); // Simple console format
log.quiet('json');   // JSON format
```

#### Custom Logger Instance

Create isolated logger instances with custom configuration:

```typescript
import { Logger } from '@paradoxical-io/common-server/logger';

const customLogger = new Logger(
  { service: 'payment-service' },
  undefined,
  customWinstonOptions
);

customLogger.info('Payment processed');
```

#### Console Hijacking

Redirect console.log/error/warn to your logger:

```typescript
Logger.highjackConsole();

console.log('This will go through the logger system');
console.error('This too');
```

## Configuration

### Environment Variables

- `PARADOX_LOG_LEVEL`: Set log level (default: 'info')
- `PARADOX_WINSTON_LOG_FORMAT`: Winston format (e.g., 'simple', 'json')
- `PARADOX_WRITE_LOG_FILE`: Enable file logging
- `PARADOX_DISABLE_CONTEXT_LOG_MESSAGE`: Disable context in log messages
- `PARADOX_SKIP_LOG_DECORATORS`: Disable method decorators
- `PARADOX_LOG_TASK_NAME`: Include service name in logs
- `PARADOX_REVISION`: Add git revision to logs

## API Reference

### Logger Class

#### Methods

- `info(msg: string)`: Log info level message
- `warn(msg: string, error?: Error)`: Log warning with optional error
- `error(msg: string, error?: Error)`: Log error with optional error
- `debug(msg: string, error?: Error)`: Log debug message
- `trace(msg: string)`: Log trace level (silly) message
- `alarm(msg: AlertableLog)`: Log alertable warning
- `once(msg: string, key?: string)`: Log message only once
- `metrics(msg: string, metrics: { latencyMS: number }, ctx?: Context)`: Log structured metrics
- `with(context: Context)`: Create new logger with additional context
- `withTags(tags: Tags)`: Add metric tags
- `withTrace(traceId: string)`: Add custom trace ID
- `quiet(format?: 'simple' | 'json')`: Enable quiet mode
- `skipMetrics()`: Return logger that doesn't emit metrics
- `isQuiet()`: Check if logger is in quiet mode

### Decorators

#### @logMethod(options?)

Automatically log method entry, exit, timing, and optionally results.

Options:
- `enableMetrics?: boolean` - Log timing metrics (default: true)
- `logResult?: boolean` - Log method return value (default: false)
- `sample?: number | { dev?: number, prod?: number }` - Sample percentage 0-100

#### @sensitive(redaction?)

Mark method parameter as sensitive for redaction.

Parameters:
- `redaction?: PathRedaction<T>` - Optional: specify which fields to redact

#### @argLogger

Mark a property as the logger instance for decorator logging (enables context propagation in classes).

### Redaction Functions

#### redact<T>(data: T, options?: PathRedaction<T>): T

Recursively redact sensitive fields in an object.

Options:
- `keys?: Array<keyof T>` - Specific top-level keys to redact
- `fieldNames?: string[]` - Field names to redact globally (deep)

#### redactKey(data: any): string

Redact a single value entirely.

## Integration with Tracing

The logger automatically integrates with the trace module to inject:
- `trace`: Global trace ID for the entire request
- `subTrace`: Sub-trace ID for specific operations
- `userId`: Current user ID from context

```typescript
import { withTrace } from '@paradoxical-io/common-server/trace';

await withTrace(async () => {
  log.info('This log will include trace IDs');
  // Automatic trace ID injection
});
```

## Best Practices

1. **Use contextual logging**: Prefer `log.with({ ... })` over string interpolation
2. **Redact sensitive data**: Always use `@sensitive()` for passwords, tokens, etc.
3. **Use appropriate log levels**:
   - `error`: Actionable errors requiring investigation
   - `warn`: Concerning but handled situations
   - `info`: Important business events
   - `debug`: Detailed diagnostic information
4. **Sample high-volume logs**: Use `sample` option for frequently-called methods
5. **Structure your logs**: Pass context objects rather than embedding in messages
6. **Use alarms sparingly**: Only for critical issues requiring immediate attention

## Testing

When testing code that uses logging:

```typescript
// Suppress logs in tests
process.env.PARADOX_LOG_LEVEL = 'error';

// Or spy on logs
const spy = jest.spyOn(process.stdout, 'write');
log.info('test message');
const logOutput = JSON.parse(spy.mock.calls[0][0].toString());
expect(logOutput.message).toEqual('test message');
```

## License

MIT
