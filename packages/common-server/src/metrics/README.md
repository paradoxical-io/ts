# Metrics Module

A comprehensive metrics collection and reporting system for Node.js applications with support for StatsD, Datadog, event loop monitoring, and method timing decorators.

## Features

- **Multiple Backend Support**: Automatically uses Datadog HTTP API in local/CI environments or StatsD in production
- **Method Timing Decorator**: Easily track method execution time with the `@timed` decorator
- **Event Loop Monitoring**: Monitor Node.js event loop lag, memory usage, CPU usage, and garbage collection
- **Graceful Shutdown**: Properly flush metrics on application shutdown
- **Test Support**: Mock metrics for testing environments
- **Flexible Tagging**: Add custom tags to all metrics for better filtering and analysis

## Installation

This module is part of `@paradoxical-io/common-server` and uses `hot-shots` for StatsD support.

```bash
npm install @paradoxical-io/common-server hot-shots
```

## Basic Usage

### Incrementing Counters

```typescript
import { Metrics } from '@paradoxical-io/common-server/metrics';

// Simple increment
Metrics.instance.increment('api.requests');

// Increment with custom value
Metrics.instance.increment('api.requests', 5);

// Increment with tags
Metrics.instance.increment('api.requests', {
  endpoint: '/users',
  method: 'GET'
});

// Increment with value and tags
Metrics.instance.increment('api.requests', 10, {
  endpoint: '/users'
});
```

### Recording Timings

```typescript
import { Metrics } from '@paradoxical-io/common-server/metrics';

// Record execution time in milliseconds
const start = Date.now();
await someOperation();
const duration = Date.now() - start;

Metrics.instance.timing('operation.duration', duration, {
  operation: 'database_query'
});
```

### Recording Gauges

```typescript
import { Metrics } from '@paradoxical-io/common-server/metrics';

// Record current value (memory, queue size, etc.)
Metrics.instance.gauge('queue.size', queueLength, {
  queue: 'email_notifications'
});
```

### Method Timing Decorator

The `@timed` decorator automatically tracks method execution time for both synchronous and asynchronous methods:

```typescript
import { timed } from '@paradoxical-io/common-server/metrics';

class UserService {
  // Async method with custom stat name and tags
  @timed({ stat: 'user.fetch.time', tags: { source: 'database' } })
  async fetchUser(id: string): Promise<User> {
    return await this.db.getUser(id);
  }

  // Sync method with default stat name (method.timed)
  @timed()
  processData(data: any): Result {
    // Processing logic
    return result;
  }

  // Async method with only custom tags
  @timed({ tags: { priority: 'high' } })
  async sendEmail(email: Email): Promise<void> {
    await this.emailClient.send(email);
  }
}
```

The decorator automatically:
- Measures execution time for both sync and async methods
- Adds a `name` tag with format `ClassName.methodName`
- Uses `method.timed` as the default stat name if not specified
- Works seamlessly with other decorators like `@logMethod`

### Event Loop and Node.js Monitoring

Monitor Node.js runtime metrics including event loop lag, memory usage, CPU usage, and garbage collection:

```typescript
import { monitorNodeMetrics } from '@paradoxical-io/common-server/metrics';

// Start monitoring with default settings (check every 1 second, log if lag > 1 second)
monitorNodeMetrics();

// Custom configuration
monitorNodeMetrics({
  frequencyMS: 5000,    // Check every 5 seconds
  logOnMaxMS: 2000      // Log warning if lag exceeds 2 seconds
});

// Disable lag warnings
monitorNodeMetrics({
  frequencyMS: 1000,
  logOnMaxMS: null      // Don't log warnings
});
```

This monitors and emits:
- `event_loop.lag` - Event loop delay in milliseconds
- `node.mem` - Memory usage (heapTotal, heapUsed, external, rss)
- `node.cpu.user_time` - CPU user time
- `node.cpu.system_time` - CPU system time
- `node.gc.time` - Garbage collection duration by type

## Configuration

### Environment Variables

- `DD_API_KEY` - Datadog API key (enables HTTP Datadog in local/CI environments)
- `DD_TAGS` - Default tags for all metrics (format: `key1:value1,key2:value2`)
- `METRICS_PREFIX` - Prefix for all metric names
- `NODE_ENV` - Set to `test` to enable mock metrics
- `PARADOX_SKIP_TIMING_DECORATORS` - Set to `true` to disable `@timed` decorators

### Custom Metrics Instance

Replace the global metrics instance with your own:

```typescript
import { withMetrics } from '@paradoxical-io/common-server/metrics';
import { StatsD } from 'hot-shots';

const customMetrics = new StatsD({
  host: 'metrics.example.com',
  port: 8125,
  prefix: 'myapp.',
  globalTags: { environment: 'production' }
});

withMetrics(customMetrics);
```

### Datadog HTTP API

When running locally or in CI with `DD_API_KEY` set, the module automatically uses the Datadog HTTP API:

```typescript
import { DDogApi, HttpDDogMetrics } from '@paradoxical-io/common-server/metrics';

// Create with custom configuration
const ddogApi = new DDogApi(
  process.env.DD_API_KEY as ApiKey,
  { service: 'my-service', env: 'production' }
);

const metrics = new HttpDDogMetrics(ddogApi, 2000); // 2 second flush time
```

## Graceful Shutdown

Always call `shutdownMetrics` during application shutdown to ensure all metrics are flushed:

```typescript
import { shutdownMetrics } from '@paradoxical-io/common-server/metrics';

process.on('SIGTERM', async () => {
  await shutdownMetrics();
  process.exit(0);
});
```

## Testing

Use mock metrics in tests to verify metric emissions:

```typescript
import { Metrics, useTestMetrics } from '@paradoxical-io/common-server/metrics';
import { StatsD } from 'hot-shots';

// Option 1: Use the built-in test helper
await useTestMetrics(async (statsD: StatsD) => {
  // Your test code here
  Metrics.instance.increment('test.metric');

  // Verify metrics
  expect(statsD.mockBuffer).toContain('test.metric');
});

// Option 2: Access mockBuffer directly in test environment
beforeEach(() => {
  Metrics.instance.mockBuffer = [];
});

test('emits correct metrics', () => {
  myFunction();

  expect(Metrics.instance.mockBuffer).toHaveLength(1);
  expect(Metrics.instance.mockBuffer[0]).toMatch(/my.metric/);
});
```

### Local Testing with netcat

To test metrics locally, you can start a UDP listener:

```bash
nc -ul 8125
```

This will display all metrics being sent to the local StatsD endpoint.

## API Reference

### MetricEmitter Interface

```typescript
interface MetricEmitter {
  increment(stat: string, value: number, tags?: Tags): void;
  increment(stat: string, tags?: Tags): void;
  timing(stat: string, value: number, tags?: Tags): void;
  gauge(stat: string, value: number, tags?: Tags): void;
  asyncTimer<T>(func: (...args: any[]) => Promise<T>, stat: string, tags?: Tags): (...args: any[]) => Promise<T>;
  close(callback: (error?: Error) => void): void;
}

interface Tags {
  [key: string]: string;
}
```

### Global Constants

```typescript
import { globalKeys } from '@paradoxical-io/common-server/metrics';

// Pre-defined metric keys
globalKeys.crash;     // 'app.crash'
globalKeys.shutdown;  // 'app.shutdown'
```

## Best Practices

1. **Use the decorator for method timing**: The `@timed` decorator is the easiest way to track execution time
2. **Always add relevant tags**: Tags enable powerful filtering and analysis in your metrics dashboard
3. **Monitor event loop in production**: Call `monitorNodeMetrics()` early in your application startup
4. **Graceful shutdown**: Always call `shutdownMetrics()` to ensure metrics are flushed before exit
5. **Use meaningful metric names**: Follow a consistent naming convention like `category.action.metric_type`
6. **Test your metrics**: Use mock metrics in tests to verify your code emits the expected metrics

## Architecture

The module uses a plugin architecture with multiple backends:

- **StatsD Backend** (`hot-shots`): Used in production environments, sends metrics via UDP
- **Datadog HTTP Backend** (`HttpDDogMetrics`): Used locally/CI when `DD_API_KEY` is set, sends metrics via HTTP API
- **Mock Backend**: Automatically enabled in test environments for verification

The `Metrics.instance` singleton provides a consistent interface regardless of the backend in use.
