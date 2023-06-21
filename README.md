# paradox-ts

[![npm version](https://badge.fury.io/js/@paradoxical-io%2Ftypes.svg)](https://badge.fury.io/js/@paradoxical-io%2Ftypes) ![build status](https://github.com/paradoxical-io/ts/actions/workflows/build.yml/badge.svg)

A collection of useful typescript first common libraries, tooling, and shared utilities.

The main goal is to create simple and safe production level code that is easy to test, has distributed tracing built in, branded types first, and dependency injected for easy extension.

A sample of some things we support

- CSV read/write
- AES 256 crypto for KEK and DEK
- consistent hashing to pin user ids to feature flags in memory
- SFTP read/write
- Production ready tracing, logging, metrics
- Wrapped and sane AWS tooling for dynamo, sqs, s3, lambda
- TypeORM tooling to create in memory tests, unified type entities, JSON serialization, generally accepted account principle decorators, XPATH query support, timing and metrics, etc
- Simple and useable branded types as well as type utilities
- Strongly typed Jest expectations for compile time support on `expect`
- ... and more!

Diving deeper into a few subjects:

# Tracing

Tracing across async contexts is critical to be able to know who did what action when. All the AWS and core libraries here automatically pull and read from [node CLS](https://www.npmjs.com/package/node-cls) in order to pass a context and trace. A traceID is one that spans the entire request. Imagine a user hits an API endpoint. At this point we can assign a trace and for the entire async flow pass that trace along. The logging utility provided here (which wraps `winston`) automatically adds the trace into all log statements. This way you can do easy filtering of JUST the actions this user did, even in a high volume logging situation of many other users.

## AWS

In that vein we have wrapped SQS for easy publish/consume that passes trace contexts along with messages so that traces are persisted across queue boundaries.

### Publishers/Consumers

We have also wrapped up the consumers so that they can be easily paralleizable, by passing in a consume function to process messages. Consumers take many other options, and allow you to retry messages, defer messages, re-publish messages, etc, as you see fit.

Our publishers wrap your data in a standard envelope which allows for non-modification of the existing over the wire data but allows us to pass extra metadata that the consumers can use.

These publishers/consumers have all been used heavily in production and are well battle tested.

# SQL

## TypeORM

TypeORM is a great piece of technology and we've extended it to add some sane defaults. Our TypeORM wrappers add `createdAt`, `updatedAt` and `deletedAt` to every entity and we've created some base class support to help abstract sqlite vs mysql/others. We love using sqlite in unit tests local because they can be in memory, are fast to spin up, and give a very close semblance to actual production (though not always perfect!).

We have exposed tooling to be able to dump the sqlite db to disk for exploring if tests are failing, as well as a myriad of ways to configure your production system (to mysql).

# Logging

Other than the trace logging we've mentioned above, our logger supports context sensitive log wrapping. For example:

```
log.with({ env: currentEnvironment() }).info('Booting up!');
```

Will print out

````
Booting up! env=dev```
````

Or if you are using the JSON formatter it will use structured key value's to include your with statements.

This way you can capture loggers to use in existing contexts without constantly adding "userId=foo" to every message. It also forces consistent formatting so that tools like datadog or logstash can easily parse and analyze your structured tags.

On top of that, we strongly believe that logs should be informative but not invasive. Taking a page from pure functional programming we can glean a lot of information from our inputs, outputs, and how long the function took. This is easily achievable with a low friction annotation:

```
@logMethod()
  async yourMethod(args: YourArg) ...
```

The logmethod annotation will log twice (3 times if you request to log the result).

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
