# @paradoxical-io/common-server

A comprehensive TypeScript server utilities library providing essential infrastructure components for building production-ready Node.js services. This package includes logging, metrics, configuration management, caching, encryption, process management, and more.

## Features

- **Structured Logging** - Winston-based logger with context propagation, redaction, and DataDog integration
- **Metrics & Monitoring** - StatsD/DataDog metrics with decorators for automatic method timing
- **Configuration Management** - Type-safe configuration loading with Convict
- **Distributed Tracing** - CLS-based trace context for request correlation
- **Caching** - Abstract cache interface for consistent caching patterns
- **Encryption** - RSA and AES encryption utilities
- **Retry Logic** - Decorator-based retry with exponential backoff
- **CSV Processing** - Type-safe CSV reading and writing
- **Process Management** - Safe process spawning and signal handling
- **Service Base** - Application framework with graceful shutdown and error handling
- **Consistent Hashing** - Deterministic hashing for feature flags and A/B testing

## Installation

```bash
npm install @paradoxical-io/common-server
# or
yarn add @paradoxical-io/common-server
```

## Usage

### Logging

The logger provides structured logging with automatic context propagation and support for distributed tracing.

```typescript
import { log, Logger } from '@paradoxical-io/common-server';

// Simple logging
log.info('Application started');
log.error('Something went wrong', error);
log.warn('Warning message');

// Contextual logging
const contextLogger = log.with({ userId: '123', requestId: 'abc' });
contextLogger.info('Processing request'); // Automatically includes context

// One-time logging (prevents duplicate messages)
log.once('Database connected');

// Alertable logs for monitoring
log.alarm('High error rate detected' as AlertableLog);
```

### Decorators for Logging and Metrics

Automatically log method calls and track performance with TypeScript decorators.

```typescript
import { logMethod, timed, sensitive } from '@paradoxical-io/common-server';

class UserService {
  @logMethod({ enableMetrics: true, logResult: true })
  @timed({ tags: { service: 'user' } })
  async getUser(@sensitive() password: string, userId: string) {
    // Method arguments are logged (password redacted)
    // Execution time is tracked and sent to metrics
    return { userId, name: 'John Doe' };
  }
}
```

### Distributed Tracing

Track requests across async operations with continuation-local storage.

```typescript
import { withNewTrace, traceID, setCurrentUserId } from '@paradoxical-io/common-server';

// Wrap operations in a trace context
withNewTrace(() => {
  setCurrentUserId('user-123');

  // All logs within this context will include the trace ID
  log.info('Processing in traced context');

  // Get current trace
  const trace = traceID();
  console.log(trace.trace, trace.subTrace);
});
```

### Retry Logic

Add automatic retry behavior to methods with exponential backoff.

```typescript
import { retry, axiosRetry } from '@paradoxical-io/common-server';

class ApiClient {
  @retry({ retries: 5, maxTimeout: 10000 })
  async fetchData() {
    // Automatically retries on failure
    return await fetch('https://api.example.com/data');
  }

  @axiosRetry([400, 404]) // Skip retry for specific status codes
  async postData(payload: object) {
    return await axios.post('/api/endpoint', payload);
  }
}
```

### Configuration Management

Type-safe configuration loading with environment-specific overrides.

```typescript
import { load } from '@paradoxical-io/common-server';
import { Env } from '@paradoxical-io/types';

interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
  };
  apiKey: string;
}

const configShape = (env: Env) => ({
  port: {
    doc: 'Server port',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  database: {
    host: {
      doc: 'Database host',
      format: String,
      default: 'localhost'
    },
    port: {
      doc: 'Database port',
      format: 'port',
      default: 5432
    }
  },
  apiKey: {
    doc: 'API key',
    format: String,
    default: '',
    sensitive: true
  }
});

// Load from config/local.json or config/prod.json
const config = load<AppConfig>('config', 'local', configShape);
```

### Metrics

Emit metrics to StatsD or DataDog for monitoring application performance.

```typescript
import { Metrics, withMetrics } from '@paradoxical-io/common-server';

// Increment counter
Metrics.instance.increment('api.requests', { endpoint: '/users' });

// Record timing
Metrics.instance.timing('api.latency', 150, { endpoint: '/users' });

// Set gauge
Metrics.instance.gauge('active.connections', 42);

// Use custom metrics instance
import { StatsD } from 'hot-shots';
withMetrics(new StatsD({ host: 'metrics.example.com' }));
```

### Consistent Hashing

Deterministic hashing for feature flags, A/B testing, and load distribution.

```typescript
import { consistentHash, consistentChance, md5 } from '@paradoxical-io/common-server';

// Hash a value to 0-1 range (always returns same value for same input)
const hash = consistentHash('user-123'); // 0.0 - 1.0

// Probabilistic feature flags
const isEnabled = consistentChance('user-123', 'new-feature', 10); // 10% rollout

// MD5 hashing
const signature = md5('some-data');
```

### Service Base

Build production-ready services with built-in error handling and graceful shutdown.

```typescript
import { ServiceBase, app } from '@paradoxical-io/common-server';

class MyService extends ServiceBase {
  name = 'my-service';

  async start(): Promise<void> {
    log.info('Service starting...');

    // Your service initialization code
    await this.connectDatabase();
    await this.startHttpServer();

    log.info('Service ready');
  }

  private async connectDatabase() {
    // Database connection logic
  }

  private async startHttpServer() {
    // HTTP server setup
  }
}

// Run with automatic error handling and metrics
app(new MyService());
```

### CSV Operations

Type-safe CSV reading and writing with streaming support.

```typescript
import { CsvReader, Csv } from '@paradoxical-io/common-server';

// Reading CSV
interface User {
  name: string;
  email: string;
  age: string;
}

const reader = new CsvReader<User>();
const users = await reader.read<User>('/path/to/users.csv');

// Writing CSV
const csv = new Csv<User>('/path/to/output.csv', [
  { id: 'name', title: 'Name' },
  { id: 'email', title: 'Email' },
  { id: 'age', title: 'Age' }
]);

await csv.write([
  { name: 'John', email: 'john@example.com', age: '30' },
  { name: 'Jane', email: 'jane@example.com', age: '25' }
]);
```

### Process Management

Safely spawn child processes with proper signal handling.

```typescript
import { spawnPromise, runShell } from '@paradoxical-io/common-server';

// Spawn a process
const { code, result } = await spawnPromise('npm', ['install'], {
  verbose: true,
  cwd: '/path/to/project',
  acceptableErrorCodes: [0]
});

// Run shell command
const exitCode = await runShell('git status', {
  verbose: true,
  cwd: process.cwd()
});
```

### Encryption

RSA public/private key encryption for sensitive data.

```typescript
import { Encryption } from '@paradoxical-io/common-server';
import { PublicKey, PrivateKey, PrivateKeyPassphrase } from '@paradoxical-io/types';

const publicKey = '-----BEGIN PUBLIC KEY-----...' as PublicKey;
const privateKey = '-----BEGIN PRIVATE KEY-----...' as PrivateKey;
const passphrase = 'secret' as PrivateKeyPassphrase;

// Encrypt with public key
const encrypted = Encryption.encryptWithPublicKey('sensitive data', publicKey);

// Decrypt with private key
const decrypted = Encryption.decryptWithPrivateKey(encrypted, privateKey, passphrase);
```

### Cache Interface

Abstract caching interface for consistent patterns across implementations.

```typescript
import { Cache } from '@paradoxical-io/common-server';
import { CacheKey, Milliseconds } from '@paradoxical-io/types';

class MyCache implements Cache {
  async get<T>(key: CacheKey<T>): Promise<T | undefined> {
    // Implementation
  }

  async set<T>(key: CacheKey<T>, value: T, ttl?: Milliseconds): Promise<void> {
    // Implementation
  }

  async delete<T>(key: CacheKey<T>): Promise<void> {
    // Implementation
  }

  async increment(key: CacheKey<number>): Promise<number> {
    // Implementation
  }

  async multiGet<T>(keys: Array<CacheKey<T>>): Promise<Map<CacheKey<T>, T>> {
    // Implementation
  }

  async close(): Promise<void> {
    // Cleanup
  }
}
```

## Environment Variables

The library respects several environment variables for configuration:

- `PARADOX_LOG_LEVEL` - Set log level (debug, info, warn, error)
- `PARADOX_ENV` - Environment name (local, dev, prod)
- `DD_API_KEY` - DataDog API key for metrics
- `METRICS_PREFIX` - Prefix for all metrics
- `PARADOX_SKIP_LOG_DECORATORS` - Disable log decorators
- `PARADOX_SKIP_TIMING_DECORATORS` - Disable timing decorators
- `TZ` - Timezone (should be set to 'UTC')

## API

### Logger
- `log.info(msg)` - Log info message
- `log.error(msg, error?)` - Log error with optional error object
- `log.warn(msg, error?)` - Log warning
- `log.debug(msg, error?)` - Log debug message
- `log.with(context)` - Create logger with additional context
- `log.once(msg, key?)` - Log message only once
- `log.alarm(msg)` - Log alertable message

### Metrics
- `Metrics.instance.increment(name, tags?)` - Increment counter
- `Metrics.instance.timing(name, ms, tags?)` - Record timing
- `Metrics.instance.gauge(name, value, tags?)` - Set gauge value

### Decorators
- `@logMethod(options?)` - Log method calls with arguments
- `@timed(options?)` - Track method execution time
- `@retry(options?)` - Add retry logic to methods
- `@sensitive(redaction?)` - Mark parameters as sensitive

### Tracing
- `withNewTrace(fn, trace?, context?)` - Create new trace context
- `traceID()` - Get current trace ID
- `setCurrentUserId(userId)` - Set user ID in trace context
- `getCurrentUserId()` - Get current user ID

## License

MIT

## Author

Anton Kropp