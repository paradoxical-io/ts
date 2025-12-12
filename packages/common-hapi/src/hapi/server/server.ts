import 'reflect-metadata';

import Boom from '@hapi/boom';
import {
  HandlerDecorations,
  Lifecycle,
  Request,
  RequestOrig,
  ResponseToolkit,
  Server as HapiServer,
  ServerOptions,
  ServerRoute,
} from '@hapi/hapi';
import { redact } from '@paradoxical-io/common';
import {
  addToOptionalContext,
  currentEnvironment,
  isLocal,
  log,
  MetricEmitter,
  Metrics,
  withNewTrace,
} from '@paradoxical-io/common-server';
import { notNullOrUndefined } from '@paradoxical-io/types';

import { HAPIErrorHandler, HAPILogging, HAPIMetrics, HAPIPing, SimplePlugin } from '../plugins';
import { ErrorHandler } from '../plugins/errors/errorHandler';
import { InMemoryRateLimitingPlugin } from '../plugins/inMemoryRateLimiting';
import { HAPIRoute, HAPIRoutes } from '../routable';
import { getClientIP } from '../util';
import ReturnValue = Lifecycle.ReturnValue;

export { ServerStateCookieOptions } from '@hapi/hapi';

export interface ServerOpts {
  /**
   * The list of api routes to expose on the server.
   */
  routables: Array<HAPIRoutes<HAPIRoute>>;

  /**
   * An optional list of plugins to register on the server.
   */
  plugins?: SimplePlugin[];

  /**
   * Whether or not to allow serving static assets from the server. Defaults to false.
   */
  allowStaticServing?: boolean;

  /**
   * A metrics provider to register on the server.
   */
  metrics: MetricEmitter;

  /**
   * The port to open the server on.
   */
  port: number;

  /**
   * Raw hapi server options
   */
  hapi?: ServerOptions;

  /**
   * Allow for internal log messages to surface as user facing messages if no other user facing message exists
   */
  surfaceErrorMessagesOverTheWire?: boolean;

  extractContext?: (credentials: unknown) => void;
}

interface JoiFailActionError extends Error {
  _original?: object;
  details?: Array<{ message?: string; path?: string; type?: string; context?: unknown }>;
}

/**
 * Log 400 and other errors local for debugging. this will show things like invalid payloads/etc
 */
export function loggableRouteOptions(metrics: MetricEmitter = Metrics.instance): Pick<ServerOptions, 'routes'> {
  return {
    routes: {
      validate: {
        failAction: (request, h, err: JoiFailActionError | undefined) =>
          withNewTrace(() => {
            if (err?._original) {
              err._original = redact(err._original);
            }

            // joi validation details can sometimes contain sensitive info
            // so don't include them in prod. the message itself is enough
            // and the original payload is auto redacted
            if (err?.details && Array.isArray(err.details)) {
              const allowFullDetails = isLocal || currentEnvironment() === 'dev';
              // eslint-disable-next-line no-param-reassign
              err.details = err.details.map(i => ({
                ...i,
                // if we're going to redact it log that so we can verify it, otherwise redact it
                context: allowFullDetails ? { data: i?.context, redactable: true } : '<redacted>',
              }));
            }

            // log if the user is authorized, its local, or the route is authorized
            // basically if the user has already passed auth we can log it
            if (request.auth?.credentials?.user || isLocal || notNullOrUndefined(request.route.settings.auth)) {
              log.error(
                `Unexpected payload validation for authorized user. User is submitting a payload that isn't passing the joi validation`,
                err
              );

              log.info(`Full payload: ${JSON.stringify(attemptRedaction(request.orig))}`);
              metrics.increment('joi.payload_validation_error');
            }

            // throw a generic bad request so to not leak any internal details about the
            // bad request.  returning more information acts as an attack vector about the API
            throw Boom.badRequest('Invalid request payload input');
          }, request.info.id),
      },
    },
  };
}

export class Server {
  private static defaults: ServerOpts = {
    routables: [],
    metrics: Metrics.instance,
    port: 3001,
    surfaceErrorMessagesOverTheWire: false,
  };

  readonly hapi: HapiServer;

  readonly opts: ServerOpts;

  constructor(opts: Partial<ServerOpts> = {}) {
    this.opts = { ...Server.defaults, ...opts };

    this.hapi = newHapiServer({
      port: process.env.PORT || this.opts.port,
      debug: false,
      ...this.opts.hapi,
      ...loggableRouteOptions(this.opts.metrics),
    });
  }

  async start(registerOnly = false) {
    log.info('Starting server auth and dependency initialization..');

    await this.registerPlugins();
    await this.registerRoutes();

    if (!registerOnly) {
      await this.hapi.start();
    } else {
      log.warn('Only registering routes, not starting service!');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const port = this.hapi.listener.address() ? (this.hapi.listener.address() as any).port : this.opts.port;

    log.info(`Ready on port ${port}`);
  }

  async stop() {
    log.info('Stopping server');

    await this.hapi.stop();

    log.info('Server stopped!');
  }

  private async registerPlugins() {
    const hapiErrorHandler = new HAPIErrorHandler(
      new ErrorHandler({
        surfaceErrorMessagesOverTheWire: this.opts.surfaceErrorMessagesOverTheWire,
      })
    );
    await this.hapi.register(hapiErrorHandler);

    // register the plugin disabled by default
    // routes can enable this themselves
    await this.hapi.register(new InMemoryRateLimitingPlugin());
    await this.hapi.register(new HAPILogging(hapiErrorHandler.name));
    await this.hapi.register(
      new HAPIMetrics({
        metrics: this.opts.metrics,
        statName: 'http.server',
      })
    );

    if (this.opts.plugins !== undefined) {
      for (const plugin of this.opts.plugins) {
        await this.hapi.register(plugin);
      }
    }

    if (this.opts.allowStaticServing === true) {
      // eslint-disable-next-line global-require
      await this.hapi.register(require('@hapi/inert'));
    }

    await this.hapi.register(new HAPIPing(this.opts.routables.map(i => i.healthCheck()).filter(notNullOrUndefined)));
  }

  private async registerRoutes() {
    for (const route of this.opts.routables) {
      // register plugins first since routes may need them
      for (const plugin of await route.plugins()) {
        log.info(`Registering plugin ${plugin.name}`);

        await this.hapi.register(plugin);
      }

      log.info(`Registering ${route.routeName}`);

      const tracedRoutes = route.getRoutes().map(r => {
        const x: ServerRoute = { ...r, handler: this.decorateHandlers(r.handler) };
        return x;
      });

      this.hapi.route(tracedRoutes);
    }

    // list all the routes
    this.hapi.table().forEach(route => {
      log
        .with({
          method: route.method,
          path: route.path,
        })
        .info(`registered route - ${route.method}:${route.path}`);
    });
  }

  /**
   * Applies correlation ID tracking as a higher order function as well as automatic error handling
   */
  private decorateHandlers(
    handler: Lifecycle.Method | HandlerDecorations | HAPIRoute | undefined
  ): Lifecycle.Method | HandlerDecorations | undefined {
    if (handler === undefined) {
      return handler;
    }

    if (typeof handler === 'function') {
      return (request: Request, h: ResponseToolkit, err?: Error): ReturnValue =>
        // wrap the handler in a context local storage so that all logging
        // within the handler block (but not plugins) are unified and contain "thread-local" style
        // metadata
        withNewTrace(() => {
          // because we don't really know which methods are authorized or not we should test if the request is authorized
          // and if so let the caller set the cls fields based on their authentication models
          if (request.auth.isAuthenticated) {
            this.opts?.extractContext?.(request.auth.credentials);
          }

          // always set the request ip address in context
          const ipAddress = getClientIP(request);
          if (ipAddress) {
            addToOptionalContext('ipAddress', ipAddress);
          }

          // @ts-ignore
          return handler(request, h, err);
        }, request.info.id);
    }

    return handler;
  }
}

function attemptRedaction(orig: RequestOrig): RequestOrig {
  return {
    params: orig.params,
    payload: redact(orig.payload),
    query: orig.query,
  };
}

export function newHapiServer(args?: ConstructorParameters<typeof HapiServer>[0]): HapiServer {
  const server = new HapiServer(args);
  // eslint-disable-next-line global-require
  server.validator(require('joi'));
  return server;
}
