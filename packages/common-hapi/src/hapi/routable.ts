import { RequestAuth, ServerRoute } from '@hapi/hapi';

import { HealthCheck, SimplePlugin } from './plugins';
import { HAPIWithEnvelope } from './types';

/**
 * Enveloped is a HAPIWithEnvelope of any request that is an object and unknown return type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Enveloped<TAuth extends RequestAuth> = HAPIWithEnvelope<any, any, TAuth>;

/**
 * A HAPIRoute is either an enveloped return or a standard hapi framework route object
 */
export type HAPIRoute<TAuth extends RequestAuth = RequestAuth> = Enveloped<TAuth> | ServerRoute;

/**
 * A HAPI route interface. It can return either structured enveloped routes OR
 * unstructured hapi server routes
 */
export abstract class HAPIRoutes<T extends HAPIRoute<TAuth> = HAPIRoute, TAuth extends RequestAuth = RequestAuth> {
  /**
   * Returns a list of hapi routes that all must be a type of hapi route.
   * A HAPI route is either an enveloped one or a server route.
   *
   * To get better typing and pin the routes you can do
   *
   * getRoutes: Enveloped[]
   *
   * which will ensure that all the routes are properly returning the right types
   *
   * To fall back to a mix of either type you can use
   *
   * getRoutes: HAPIRoute[]
   */
  abstract getRoutes(): T[];

  /**
   * Shut the route down
   */
  abstract close(): Promise<void>;

  /**
   * Custom plugins that this route container wants to register with the server
   */
  async plugins(): Promise<SimplePlugin[]> {
    return [];
  }

  /**
   * How to consume a health check for this service
   */
  abstract healthCheck(): HealthCheck | undefined;

  /**
   * The route name, only used for logging/auditing
   */
  abstract readonly routeName: string;
}
