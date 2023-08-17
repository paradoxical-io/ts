# Code common to @hapi

- Typed and required [validation](src/hapi/validation.ts) for input payloads
- [Simple plugin](src/hapi/plugins/simplePlugin.ts) abstractions
  - Easily wire in custom health checks per route group that can be part of the ping uptime checks
- Built in [ping endpoint for load balancing](src/hapi/plugins/ping.ts)
- Built in [metrics plugin](src/hapi/plugins/metrics.ts)
- Built in [logging plugin](src/hapi/plugins/logging.ts)
  - Automatic redaction of PII sensitive data based on property name heuristics of `ssn`, `password`, etc
- Standard [error handling plugin](src/hapi/plugins/errors/errorHandlerPlugin.ts)
  - Sane responses detected on invalid connections to sql drivers to report back maintenance downtime
- [HMAC authorization](src/hapi/auth/hmac.ts) support
- [Bearer authorization](src/hapi/auth/bearer.ts) support
- [IP Filtering](src/hapi/auth/ipFiltering.ts) plugin support for per route allow lists
- Simple registration of [routables](src/hapi/routable.ts) to register with hapi
- [Server wrapper](src/hapi/server/server.ts) that
  - Allows CLS based traces for per-request tracing
- Standardizes [response in an envelope shape](src/hapi/types.ts), provides built in localization support, standard error codes, and more

## Get started

Create a service entrypoint that is auto wired to register routes and responds to shutdown sequences

```
export class App extends ServiceBase {
  name = 'backend-service';

  async start(): Promise<void> {
    const route = new Routes();

    const server = new Server({
      routables: [route],
    });

    await server.start();

    signals.onShutdown(async () => {
      await server.stop();
    });
  }
}
```

Now create your registration routes

```
export class Routes implements HAPIRoutes<HAPIRoute<FirebaseRequestAuth>> {
  readonly routeName = 'backend-routes';

  async close(): Promise<void> {}

  getRoutes(): HAPIRoute<FirebaseRequestAuth>[] {
    return [
      {
        method: 'POST',
        handler: (req: TypedRequest<{ test: string }>): EnvelopeResponse<{ response: string }> => envelope({
            response: req.payload.test
          }),
        options: {
          validate: {
            payload: {
              test: Joi.string().required(),
            },
          },
        },
        path: `/api/v1/check`,
      },
    ];
  }

  healthCheck(): HealthCheck | undefined {
    return undefined;
  }

  async plugins(): Promise<SimplePlugin[]> {
    return [];
  }
}
```

Now you can start the service up and call `POST localhost:3001/api/v1/check` and send a body of `{"test": "foo"}` and get it back printed to you.  
