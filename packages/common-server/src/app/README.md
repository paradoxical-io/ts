# App Module

A robust Node.js service lifecycle management module that provides standardized bootstrapping, error handling, and graceful shutdown capabilities for production server applications. This module ensures services run with proper monitoring, timezone validation, and comprehensive crash reporting.

## Features

- **Service Lifecycle Management**: Abstract base class for standardizing service initialization and startup
- **Automatic Error Handling**: Global handlers for uncaught exceptions and unhandled promise rejections
- **Graceful Shutdown**: Signal handling (SIGTERM, SIGINT) with metric flushing before exit
- **Production Safeguards**: Environment validation, UTC timezone enforcement, and production confirmation prompts
- **Node.js Monitoring**: Built-in event loop monitoring and performance metrics
- **Console Hijacking**: Automatic console.log redirection to structured logging in production
- **Closeable Pattern**: Interface for managing resources with explicit cleanup

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Usage

### Basic Service Implementation

The most common pattern is to extend `ServiceBase` and implement your service logic:

```typescript
import { ServiceBase, app } from '@paradoxical-io/common-server';

class MyApiService extends ServiceBase {
  name = 'my-api-service';

  async start(): Promise<void> {
    // Initialize your server, database connections, etc.
    const server = await startExpressServer(3000);

    // Register shutdown hooks
    signals.onShutdown(async () => {
      await server.close();
    });

    console.log('Service is running on port 3000');
  }
}

// Run the service with automatic error handling and metrics
app(new MyApiService());
```

### Using the Safe Wrapper for Synchronous Code

For simpler services or scripts that don't require async initialization:

```typescript
import { safe, validateUTCSet } from '@paradoxical-io/common-server';

safe(() => {
  // Your synchronous service code
  const server = createServer();
  server.listen(3000);
});
```

### Implementing the Closeable Interface

Use the `Closeable` interface for resources that need explicit cleanup:

```typescript
import { Closeable } from '@paradoxical-io/common-server';

class DatabaseConnection implements Closeable<Database> {
  instance: Database;

  constructor(connectionString: string) {
    this.instance = new Database(connectionString);
  }

  async close(): Promise<void> {
    await this.instance.disconnect();
    console.log('Database connection closed');
  }
}

// Usage with automatic cleanup
const dbConnection = new DatabaseConnection('postgresql://...');
signals.onShutdown(() => dbConnection.close());
```

### Custom Service with Production Safeguards

The module automatically provides production safeguards:

```typescript
import { ServiceBase, app } from '@paradoxical-io/common-server';

class DataMigrationService extends ServiceBase {
  name = 'data-migration';

  async start(): Promise<void> {
    // If running in prod from local machine, user must enter confirmation code
    // UTC timezone is automatically validated
    // Metrics are automatically monitored

    await this.runMigration();
  }

  private async runMigration(): Promise<void> {
    // Your migration logic here
  }
}

app(new DataMigrationService());
```

## API

### `ServiceBase` (Abstract Class)

Base class for all services. Automatically sets up error handlers, metrics monitoring, and environment validation.

**Properties:**
- `name: string` - Service identifier used in logs and metrics

**Methods:**
- `start(): Promise<void>` - Abstract method where you implement service initialization
- `run(): Promise<void>` - Handles production confirmation prompts before calling `start()`

**Automatic Features:**
- Uncaught exception handling with metric emission
- Unhandled promise rejection handling
- UTC timezone validation
- Event loop monitoring (1-second intervals)
- Environment warnings when running locally against remote resources
- Console hijacking in non-local environments

### `app(service: ServiceBase): Promise<void>`

Runs a ServiceBase instance with comprehensive error handling and metric reporting. Validates timezone, logs startup, and ensures graceful shutdown on failures.

```typescript
await app(new MyService());
```

### `safe<T>(block: () => T): void`

Executes synchronous code with automatic error handling and metric emission. Validates UTC timezone before execution.

```typescript
safe(() => {
  startServer();
});
```

### `validateUTCSet(): void`

Validates that the application is running in UTC timezone. Throws an error if timezone offset is not zero. Required for consistent date/time handling across distributed systems.

```typescript
validateUTCSet(); // Throws if TZ !== 'UTC'
```

### `Closeable<T>` (Interface)

Interface for resources that require explicit cleanup. Useful for database connections, file handles, and other stateful resources.

```typescript
interface Closeable<T> {
  instance: T;
  close(): Promise<void>;
}
```

## Environment Variables

- `TZ`: Must be set to `'UTC'` (enforced automatically)
- `PARADOX_ENV`: Environment identifier (e.g., 'local', 'staging', 'prod')

## Production Safety Features

1. **UTC Validation**: All services must run in UTC timezone to prevent date/time bugs
2. **Production Confirmation**: When running in prod from a local machine, requires entering a random 6-character code
3. **Environment Warnings**: Large red warnings when running locally against remote environments
4. **Automatic Metrics**: Crash metrics are automatically incremented and flushed before exit
5. **Graceful Shutdown**: Metrics are flushed on SIGTERM/SIGINT before process termination

## Error Handling

The module provides comprehensive error handling:

- **Uncaught Exceptions**: Logged, metrics incremented, graceful shutdown initiated
- **Unhandled Promise Rejections**: Logged, metrics incremented, graceful shutdown initiated
- **Node.js Warnings**: Logged for visibility
- **Startup Failures**: Caught in `app()` wrapper with proper metric emission

All errors trigger a graceful shutdown sequence that ensures metrics are flushed before the process exits.

## Integration with Other Modules

This module integrates with other `@paradoxical-io/common-server` modules:

- **Logger**: Structured logging with context
- **Metrics**: StatsD metrics emission
- **Process**: Signal handling and process management
- **Env**: Environment detection and validation
