# paradox-ts

[![npm version](https://badge.fury.io/js/@paradoxical-io%2Ftypes.svg)](https://badge.fury.io/js/@paradoxical-io%2Ftypes) ![build status](https://github.com/paradoxical-io/ts/actions/workflows/build.yml/badge.svg)

A collection of useful typescript first common libraries, tooling, and shared utilities.

The main goal is to create simple and safe production level code that is easy to test, has distributed tracing built in, branded types first, and dependency injected for easy extension.

A sample of some things we support

- [CSV read/write](packages/common-server/src/csv)
- [AES 256 crypto for KEK and DEK](packages/common-server/src/encryption)
- [consistent hashing](packages/common-server/src/hash) to pin user ids to feature flags in memory
- [SFTP read/write](packages/common-server/src/sftp)
- [Typesafe convict configuration](packages/common-server/src/config/contracts.ts)
- Production ready [tracing](packages/common-server/src/trace), [logging](packages/common-server/src/logger), [metrics](packages/common-server/src/metrics)
- Wrapped and sane AWS tooling for
  - [dynamo](packages/common-aws/src/dynamo) - read, write, stream, dynamo based locks
  - [sqs](packages/common-aws/src/sqs) - batch and single publishers with tracing built in, simple function based consumers that retry, have metrics, configurable batching, synchronized application shutdown (finish processing when signal raised, etc)
  - [s3](packages/common-aws/src/s3) - async generator streaming of s3 buckets
  - [api gateway](packages/common-aws/src/gateway) - websocket publishing support
- [TypeORM tooling](packages/common-sql/src) to create in memory tests, [unified type entities](packages/common-sql/src/sql/crudBase.ts), [JSON serialization](packages/common-sql/src/sql/typeorm/transformers), generally accepted [accounting principle decorators](packages/common-sql/src/sql/typeorm/money.ts), [XPATH](packages/common-sql/src/sql/typeorm/xpathBuilder.ts) query support, timing and metrics, etc
- Simple and useable [branded types](packages/types/src/brands.ts) as well as type utilities such as [exhaustiveness checking](packages/types/src/exhaustiveness.ts) and [extraction functions](packages/types/src/util.ts)
- Strongly typed [Jest expectations](packages/common-test/src/jest/index.ts) for compile time support on `expect`
  - automatic type-safe of mocking of objects via `mock<T>()`
- Logging and tracing tracing [interceptors](packages/common-server/src/http/interceptors.ts) for axios as well as [proxy configurations](packages/common-server/src/http/axios.ts)
- [Retry](packages/common-server/src/retry/poll.ts) extensions on top of [async retry](https://www.npmjs.com/package/async-retry)
- [Docker](packages/common-server/src/test/docker/index.ts) test setup tooling to make it easy to run (and stop) containers for integration tests
- [Cycle management](packages/common/src/di/deferred.ts) for safely instantiating circular dependencies when doing manual constructor based DI
- [In memory pub/sub](packages/common/src/pubsub/index.ts) to decouple abstractions 
- [Promise extensions](packages/common/src/promise) to help with timeouts, rate limiting, etc
- ... and more!

Diving deeper into a few subjects:

# Applications

Our philosophy is that applications should 

- Respect system level signals for shutdown/interrupts
- Be easy to start up and log that they are starting up
- Be safe to run in different environments without accidentally running things in production
- Log metrics on crash, startup, and other lifecycle events

To that end we have a base class called [`ServiceBase`](packages/common-server/src/app/serviceBase.ts) which handles all of this. 

`prod` vs `dev` vs `local` can be configured via the env key of `PARADOX_ENV` or via `setEnvironment('prod')`.

If we are running in prod  and the service is on a `darwin` architecture, then base class will require the user to input a random code to ensure that they aren't accidentally running prod local.  

For example, an application can be defined as 

```
class Example extends ServiceBase {
  name = 'example-service';

  start(): Promise<void> {
    // your code here
  }
}

await app(new Example())
```

# Configuration

Configuration is a big part of application infrastructure.  We have provided an opinionated wrapper on [convict](https://github.com/mozilla/node-convict) which allows you to create typed [convict shapes](packages/common-server/src/config/loader.test.ts).  

While convict provides static configuration, what happens if we want to specify configuration from external areas like AWS param store? We can also do that too! 

For example, we can create a configuration that uses the concept of a `Provided Value` which we can then _resolve_ the values from.

Imagine we load `ProvidedConfig` from [our example](packages/common-server/src/config/loader.test.ts).  How do we get the actual value of `/path/to/ssm`. We can resolve each value in parallel:

```
const resolveConfig = async (resolver: ValueProvider, config: ProvidedConfig): Promise<Config> =>  {
  return autoResolve({
    host: config.host,
    dynamic: async () => resolver.getValue(config.dynamic)
  })
}
```

`autoResolve` will recursively go through the object and automagically resolve any lambda based promises in parallel. This way you can have throughput limitation on SSM/etc and dynamically resolve your configuration with minimal friction.

See an implementation of the SSM resolver [here](packages/common-aws/src/parameter-store/config/providers/parameterStoreConfigProvider.ts).  You can plug in other resolvers as you want as well! 

For local testing override via environment variables the provider to be `Static`.



# Tracing

Tracing across async contexts is critical to be able to know who did what action when. All the AWS and core libraries here automatically pull and read from [node CLS](https://www.npmjs.com/package/node-cls) in order to pass a context and trace. A traceID is one that spans the entire request. Imagine a user hits an API endpoint. At this point we can assign a trace and for the entire async flow pass that trace along. The logging utility provided here (which wraps `winston`) automatically adds the trace into all log statements. This way you can do easy filtering of JUST the actions this user did, even in a high volume logging situation of many other users.

You may wonder how you generate a trace. To create a new one you can easily wrap any async entrypoint with 

```
await withNewTrace(async () => {
  // ...
})
```

If you have a trace already provided (for example via a library like [hapi](https://hapi.dev/tutorials/logging/?lang=en_US)) you can provide a trace ID with

```
withNewTrace(..., traceId)
```

Once the async context is done the trace is removed.

## AWS

In that vein we have wrapped SQS for easy publish/consume that passes trace contexts along with messages so that traces are persisted across queue boundaries.

### Publishers/Consumers

We have also wrapped up the consumers so that they can be easily paralleizable, by passing in a consume function to process messages. Consumers take many other options, and allow you to retry messages, defer messages, re-publish messages, etc, as you see fit.

Our publishers wrap your data in a standard envelope which allows for non-modification of the existing over the wire data but allows us to pass extra metadata that the consumers can use.

These publishers/consumers have all been used heavily in production and are well battle tested.

The over the wire format of SQS data is 

```
export interface SQSEvent<T> {
  timestamp: EpochMS;
  trace?: string;
  data: T;
  republishContext?: {
    /**
     * The total times this message has be been republished
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

# SQL

## TypeORM

TypeORM is a great piece of technology and we've extended it to add some sane defaults. Our TypeORM wrappers add `createdAt`, `updatedAt` and `deletedAt` to every entity and we've created some base class support to help abstract sqlite vs mysql/others. We love using sqlite in unit tests local because they can be in memory, are fast to spin up, and give a very close semblance to actual production (though not always perfect!).

We have exposed tooling to be able to dump the sqlite db to disk for exploring if tests are failing, as well as a myriad of ways to configure your production system (to mysql).

To see how to easily create a connection to in memory databases (sqlite) or mysql, look at the [connection factory](packages/common-sql/src/sql/connectionFactory.ts).  Instead of mocking db tests (which provide near zero testing value) use an actual db! 

# Logging

Other than the trace logging we've mentioned above, our logger supports context sensitive log wrapping. For example:

```
const envBasedLogger = log.with({ env: currentEnvironment() })

envBasedLogger.info('Booting up!');
envBasedLogger.info('Welcome');
```

Will print out

````
Booting up! env=dev
Welcome env=dev
````


Or if you are using the JSON formatter it will use structured key value's to include your with statements.

This way you can capture loggers to use in existing contexts without constantly adding "userId=foo" to every message. It also forces consistent formatting so that tools like datadog or logstash can easily parse and analyze your structured tags.

On top of that, we strongly believe that logs should be informative but not invasive. Taking a page from pure functional programming we can glean a lot of information from our inputs, outputs, and how long the function took. This is easily achievable with a low friction annotation:

```
@logMethod()
async yourMethod(args: YourArg) ...
```

The `logMethod` annotation will log twice (3 times if you request to log the result).

1. That the method started, what class it's part of, and what is the method along with its json serialized arguments.
   - Arguments can be redacted if they are sensitive by adding the `@sensitive` tag to them. You can also even redact nested arguments within objects if you provide the object path. See unit tests for examples.
2. That the method ended, if it was successful, and how long it took to run.

# Metrics

We've wrapped up hotshots to make it easier to abstract metrics to datadog or statsd. You can also wire timing metrics of how long methods took by using `@logMethod({enableMetrics = true})` which will emit timing metrics of your method.

To just do timing metrics without logging there is an `@timing` decorator to use.

Metrics support automatic tags to apply as well as supporting default prefixes if you want.

# Type Utilities

Of the many included (go exploring!) is `bottom`. This allows for compile time exhaustiveness checking of switch statements. What this means is you can compile time enforce all switch statements cover all bases, even when you add new enums.

As an example

```
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
