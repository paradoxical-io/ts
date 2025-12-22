# paradox-ts

[![npm version](https://badge.fury.io/js/@paradoxical-io%2Ftypes.svg)](https://badge.fury.io/js/@paradoxical-io%2Ftypes) ![build status](https://github.com/paradoxical-io/ts/actions/workflows/build.yml/badge.svg)

A collection of useful TypeScript-first common libraries, tooling, and shared utilities. Many of these examples are used in the book [Building A Startup - A Primer For The Individual Contributor](https://www.amazon.com/Building-Startup-Primer-Individual-Contributor/dp/B0D1QX58ZR) and have been battle tested in high-volume production services.

## Why This Library?

Building production-ready applications shouldn't mean reinventing the wheel. **paradox-ts** provides a comprehensive, battle-tested toolkit that handles the hard parts of modern application development:

- 🔒 **Type Safety First** - Branded types, exhaustiveness checking, and compile-time guarantees
- 📊 **Production Ready** - Built-in distributed tracing, structured logging, and metrics emission
- 🧪 **Easy to Test** - In-memory implementations, Docker test utilities, and type-safe mocking
- 🔌 **Dependency Injected** - Simple patterns for extensibility and testability
- ⚡ **Performance Focused** - Stream-based processing, efficient async patterns, and resource management
- 🛡️ **Safety Built-In** - Graceful shutdown, signal handling, environment safeguards

Whether you're building a startup or scaling an enterprise service, these libraries give you the foundation to focus on your business logic instead of infrastructure plumbing.

## Philosophy

Our philosophy is simple: **production code should be safe, testable, and easy to reason about.**

Applications should:

- **Respect system signals** for shutdown/interrupts
- **Be easy to start up** and log lifecycle events
- **Be safe to run** in different environments without accidentally affecting production
- **Emit metrics** on crash, startup, and other critical events
- **Trace all operations** for debugging and monitoring
- **Use types** to prevent entire classes of bugs at compile time

We strongly believe that logs should be informative but not invasive. We can glean a lot from inputs, outputs, and timing. Metrics should be automatic. Tracing should be transparent. Tests should use real implementations, not mocks.

This library is the result of years of building production services that handle millions of requests. Every utility, every pattern, every design decision comes from real-world usage and hard-learned lessons.

## Table of Contents

### Core Packages

- **[@paradoxical-io/types](packages/types/README.md)** - Branded types, exhaustiveness checking, nullability helpers, and type utilities
- **[@paradoxical-io/common](packages/common/README.md)** - Core utilities for promises, arrays, dates, pub/sub, dependency injection, and more
- **[@paradoxical-io/common-test](packages/common-test/README.md)** - Type-safe Jest utilities, mocking helpers, and testing tools

### Server Infrastructure

- **[@paradoxical-io/common-hapi](packages/common-hapi/README.md)** - Hapi framework utilities for rest based services
- **[@paradoxical-io/common-server](packages/common-server/README.md)** - Production-ready server utilities
  - [Application Framework](packages/common-server/src/app/README.md) - ServiceBase for lifecycle management
  - [Cache Interface](packages/common-server/src/cache/README.md) - Type-safe caching abstraction
  - [Configuration](packages/common-server/src/config/README.md) - Type-safe config with external providers
  - [Contracts](packages/common-server/src/contracts/README.md) - Standard interfaces for infrastructure
  - [CSV Processing](packages/common-server/src/csv/README.md) - Type-safe CSV reading and writing
  - [Encryption](packages/common-server/src/encryption/README.md) - AES-256-GCM and RSA utilities
  - [Environment](packages/common-server/src/env/README.md) - Environment detection and management
  - [Extensions](packages/common/src/extensions/README.md) - Stream and iterator utilities
  - [Hashing](packages/common-server/src/hash/README.md) - Consistent hashing for feature flags
  - [HTTP Client](packages/common-server/src/http/README.md) - Axios wrappers with logging and proxies
  - [Locking](packages/common-server/src/locking/README.md) - Distributed lock interface
  - [Logger](packages/common-server/src/logger/README.md) - Structured logging with context propagation
  - [Metrics](packages/common-server/src/metrics/README.md) - DataDog/StatsD integration with decorators
  - [Path Utilities](packages/common-server/src/path/README.md) - File system and path helpers
  - [Process Management](packages/common-server/src/process/README.md) - Command execution and Git utilities
  - [Retry Logic](packages/common-server/src/retry/README.md) - Decorators and polling utilities
  - [SFTP](packages/common-server/src/sftp/README.md) - Stream-based SFTP operations
  - [Test Utilities](packages/common-server/src/test/README.md) - In-memory implementations for testing
  - [Tracing](packages/common-server/src/trace/README.md) - Distributed tracing with CLS
  - [Zip Utilities](packages/common-server/src/zip/README.md) - Archive creation and extraction

### AWS Integration

- **[@paradoxical-io/common-aws](packages/common-aws/README.md)** - Production-ready AWS SDK wrappers
  - [DynamoDB](packages/common-aws/src/dynamo/README.md) - KeyValueTable, DynamoLock, counters, and streaming
  - [S3](packages/common-aws/src/s3/README.md) - Secure storage with KMS envelope encryption
  - [SNS](packages/common-aws/src/sns/README.md) - SMS sending utilities
  - [SQS](packages/common-aws/src/sqs/README.md) - Type-safe publishers and consumers with retry strategies

### Database Integration

- **[@paradoxical-io/common-sql](packages/common-sql/README.md)** - TypeORM utilities for SQL databases

---

## Quick Tour

Let's dive into some of the key features that make this library powerful.

### Applications

Our philosophy is that applications should respect system-level signals, be easy to start up, and be safe to run in different environments. To that end we have a base class called [`ServiceBase`](packages/common-server/src/app/serviceBase.ts) which handles all of this.

`prod` vs `dev` vs `local` can be configured via the env key of `PARADOX_ENV` or via `setEnvironment('prod')`.

If we are running in prod and the service is on a `darwin` architecture, then base class will require the user to input a random code to ensure that they aren't accidentally running prod locally.

For example, an application can be defined as:

```typescript
class Example extends ServiceBase {
  name = 'example-service';

  start(): Promise<void> {
    // your code here
  }
}

await app(new Example());
```

### Configuration

Configuration is a big part of application infrastructure. We have provided an opinionated wrapper on [convict](https://github.com/mozilla/node-convict) which allows you to create typed [convict shapes](packages/common-server/src/config/loader.test.ts).

While convict provides static configuration, what happens if we want to specify configuration from external areas like AWS Parameter Store? We can do that too!

For example, we can create a configuration that uses the concept of a `Provided Value` which we can then _resolve_ the values from.

Imagine we load `ProvidedConfig` from [our example](packages/common-server/src/config/loader.test.ts). How do we get the actual value of `/path/to/ssm`? We can resolve each value in parallel:

```typescript
const resolveConfig = async (resolver: ValueProvider, config: ProvidedConfig): Promise<Config> => {
  return autoResolve({
    host: config.host,
    dynamic: async () => resolver.getValue(config.dynamic),
  });
};
```

`autoResolve` will recursively go through the object and automagically resolve any lambda-based promises in parallel. This way you can have throughput limitation on SSM/etc and dynamically resolve your configuration with minimal friction.

See an implementation of the SSM resolver [here](packages/common-aws/src/parameter-store/config/providers/parameterStoreConfigProvider.ts). You can plug in other resolvers as you want as well!

For local testing override via environment variables the provider to be `Static`.

### Tracing

Tracing across async contexts is critical to be able to know who did what action when. All the AWS and core libraries here automatically pull and read from [node CLS](https://www.npmjs.com/package/node-cls) in order to pass a context and trace. A traceID is one that spans the entire request. Imagine a user hits an API endpoint. At this point we can assign a trace and for the entire async flow pass that trace along. The logging utility provided here (which wraps `winston`) automatically adds the trace into all log statements. This way you can do easy filtering of JUST the actions this user did, even in a high-volume logging situation of many other users.

You may wonder how you generate a trace. To create a new one you can easily wrap any async entrypoint with:

```typescript
await withNewTrace(async () => {
  // ...
});
```

If you have a trace already provided (for example via a library like [hapi](https://hapi.dev/tutorials/logging/?lang=en_US)) you can provide a trace ID with:

```typescript
withNewTrace(..., traceId)
```

Once the async context is done the trace is removed.

### AWS

In that vein we have wrapped SQS for easy publish/consume that passes trace contexts along with messages so that traces are persisted across queue boundaries.

#### Publishers/Consumers

We have also wrapped up the consumers so that they can be easily parallelizable, by passing in a consume function to process messages. Consumers take many other options, and allow you to retry messages, defer messages, re-publish messages, etc, as you see fit.

Our publishers wrap your data in a standard envelope which allows for non-modification of the existing over-the-wire data but allows us to pass extra metadata that the consumers can use.

These publishers/consumers have all been used heavily in production and are well battle tested.

The over-the-wire format of SQS data is:

```typescript
export interface SQSEvent<T> {
  timestamp: EpochMS;
  trace?: string;
  data: T;
  republishContext?: {
    /**
     * The total times this message has been republished
     */
    publishCount?: number;
    /**
     * Stop re-publishing the message after this expiration time
     */
    maxPublishExpiration?: EpochMS;

    /**
     * Always re-publish this message until this epoch occurs. Used to kick
     * messages past the max visibility timeout in SQS
     */
    processAfter?: EpochMS;
  };
}
```

Events contain when they were published, if they should be processed after a period of time (if they aren't ready yet they are booted back to the queue), if they were re-published, their originating trace, and the serialized queue data.

### SQL

#### TypeORM

TypeORM is a great piece of technology and we've extended it to add some sane defaults. Our TypeORM wrappers add `createdAt`, `updatedAt` and `deletedAt` to every entity and we've created some base class support to help abstract sqlite vs mysql/others. We love using sqlite in unit tests locally because they can be in memory, are fast to spin up, and give a very close semblance to actual production (though not always perfect!).

We have exposed tooling to be able to dump the sqlite db to disk for exploring if tests are failing, as well as a myriad of ways to configure your production system (to mysql).

To see how to easily create a connection to in-memory databases (sqlite) or mysql, look at the [connection factory](packages/common-sql/src/sql/connectionFactory.ts). Instead of mocking db tests (which provide near zero testing value) use an actual db!

### Logging

Other than the trace logging we've mentioned above, our logger supports context-sensitive log wrapping. For example:

```typescript
const envBasedLogger = log.with({ env: currentEnvironment() });

envBasedLogger.info('Booting up!');
envBasedLogger.info('Welcome');
```

Will print out:

```
Booting up! env=dev
Welcome env=dev
```

Or if you are using the JSON formatter it will use structured key-values to include your with statements.

This way you can capture loggers to use in existing contexts without constantly adding "userId=foo" to every message. It also forces consistent formatting so that tools like DataDog or Logstash can easily parse and analyze your structured tags.

On top of that, we strongly believe that logs should be informative but not invasive. Taking a page from pure functional programming we can glean a lot of information from our inputs, outputs, and how long the function took. This is easily achievable with a low friction annotation:

```typescript
@logMethod()
async yourMethod(args: YourArg) ...
```

The `logMethod` annotation will log twice (3 times if you request to log the result).

1. That the method started, what class it's part of, and what is the method along with its json serialized arguments.
   - Arguments can be redacted if they are sensitive by adding the `@sensitive` tag to them. You can also even redact nested arguments within objects if you provide the object path. See unit tests for examples.
2. That the method ended, if it was successful, and how long it took to run.

### Metrics

We've wrapped up hotshots to make it easier to abstract metrics to DataDog or StatsD. You can also wire timing metrics of how long methods took by using `@logMethod({enableMetrics = true})` which will emit timing metrics of your method.

To just do timing metrics without logging there is an `@timed` decorator to use.

Metrics support automatic tags to apply as well as supporting default prefixes if you want.

### Type Utilities

Of the many included (go exploring!) is `bottom`. This allows for compile-time exhaustiveness checking of switch statements. What this means is you can compile time enforce all switch statements cover all bases, even when you add new enums.

As an example:

```typescript
export function asMinutes(n: number, unit: TimeUnit): Minutes {
  switch (unit) {
    case 'days':
      return (n * 60 * 24) as Minutes;
    case 'hours':
      return (n * 60) as Minutes;
    case 'minutes':
      return n as Minutes;
    case 'seconds':
      return (n / 60) as Minutes;
    case 'ms':
      return (n / 60 / 1000) as Minutes;
    default:
      return bottom(unit);
  }
}
```

If we add a new `TimeUnit` we'll fail to compile. If at runtime we hit a new time unit the bottom will throw. If we want to only have compile time checking and allow runtimes to return defaults we can also do that by providing a default value to the bottom.

### Type-Safe Mocking

Testing shouldn't be painful. Our type-safe mocking utilities make it easy to create mocks that the compiler understands:

```typescript
const mockService = mock<UserService>();
mockService.getUser.mockResolvedValue(user);
```

The compiler will ensure that `getUser` is actually a method on `UserService` and that it returns the right type.

### Branded Types

Branded types prevent entire classes of bugs by making primitives semantically meaningful:

```typescript
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function getUser(id: UserId) { ... }

const userId = 'user-123' as UserId;
const orderId = 'order-456' as OrderId;

getUser(userId);    // ✅ Works
getUser(orderId);   // ❌ Compiler error - can't pass OrderId where UserId expected
```

This catches bugs at compile time that would otherwise only surface at runtime.

### Consistent Hashing

Need to roll out features gradually or run A/B tests? Our consistent hashing utilities make it deterministic and bias-free:

```typescript
// Roll out to 10% of users
if (consistentChance(userId, 'new-feature', 0.1)) {
  // User is in the 10%
}

// Each experiment gets independent distribution
consistentHashExperimentKey(userId, 'experiment-a'); // Different hash than experiment-b
```

This ensures that user experiences are consistent across sessions and that different experiments don't bias toward the same users.

---

## Installation

Install individual packages as needed:

```bash
# Core utilities
yarn add @paradoxical-io/types @paradoxical-io/common

# Server infrastructure
yarn add @paradoxical-io/common-server

# AWS utilities
yarn add @paradoxical-io/common-aws

# Testing utilities
yarn add -D @paradoxical-io/common-test

# SQL/Database
yarn add @paradoxical-io/common-sql
```

## Development

```bash
# Install dependencies
yarn install

# Compile all packages
yarn compile

# Run tests
yarn test

# Lint code
yarn lint

# Clean build artifacts
yarn clean
```

## Contributing

Contributions are welcome! This library is the result of real-world production usage, and we're always looking to improve based on practical experience.

## License

MIT

## Credits

Built with ❤️ by the team at [Paradoxical.io](https://paradoxical.io)

Many patterns and utilities featured in [Building A Startup - A Primer For The Individual Contributor](https://www.amazon.com/Building-Startup-Primer-Individual-Contributor/dp/B0D1QX58ZR)
