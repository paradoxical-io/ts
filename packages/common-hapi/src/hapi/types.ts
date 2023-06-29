import {
  Request,
  RequestAuth as HapiRequestAuth,
  RequestAuth,
  ResponseObject,
  ResponseToolkit,
  RouteOptions,
  ServerRoute,
} from '@hapi/hapi';
import { Envelope } from '@paradoxical-io/types';
import Joi from 'joi';

import { AuthStrategy } from './auth/authStrategies';
import { BearerStrategy } from './auth/bearer';
import { HmacStrategy } from './auth/hmac';
import { IpFilteringStrategy } from './auth/ipFilteringStrategy';
import { InMemoryRateLimitingOptions, InMemoryRateLimitingPlugin } from './plugins/inMemoryRateLimiting';
import { Validation } from './validation';

/**
 * A request that has a typed payload and a typed authorization payload
 */
export interface TypedRequest<TPayload extends object, TAuth extends HapiRequestAuth = HapiRequestAuth>
  extends Request {
  payload: TPayload;
  auth: TAuth;
}

/**
 * For use if there is no payload expected.
 */
export interface EmptyTypedRequest<TAuth extends HapiRequestAuth = HapiRequestAuth> extends TypedRequest<{}, TAuth> {}

/**
 * An envelope response that is either sync or async.
 */
export type EnvelopeResponse<T> =
  | Envelope<T>
  | Promise<Envelope<T>>
  /**
   * To serve stream data
   */
  | Promise<ResponseObject>;

type ValidAuth = AuthStrategy | false | BearerStrategy | HmacStrategy | IpFilteringStrategy;

type AuthorizedRoute = Pick<ServerRoute, 'options'> & {
  options: Pick<RouteOptions, 'auth'> &
    Required<{
      auth: ValidAuth;
    }>;
};

/**
 * A HAPI route with a request and response that ensures we return an envelope type
 */
export type APIRoute<Req extends object, Resp, TAuth extends RequestAuth = RequestAuth> = (
  req: TypedRequest<Req, TAuth>,
  h: ResponseToolkit
) => EnvelopeResponse<Resp>;

/**
 * An interface wrapper that defines what the handler should be for a server route
 * limits the handler response types to only allow returning envelopes
 */
export interface HAPIWithEnvelope<Req extends object, Resp, TAuth extends RequestAuth = RequestAuth>
  extends ServerRoute {
  handler: APIRoute<Req, Resp, TAuth> | undefined;
}

/**
 * A generic route that exposes a subset of a hapi server route object. This allows us to strongly type a portion
 * of the request object separate from the path and route. Doesn't force any kind of validation but exposes the options
 * to support generic routing configuration. This is a looser contract than ValidatedRoute<Req, Resp>
 */
export type Route<Req extends object, Resp, TAuth extends RequestAuth = RequestAuth> = Pick<
  HAPIWithEnvelope<Req, Resp, TAuth>,
  'handler' | 'options'
> &
  AuthorizedRoute;

interface Options<T extends object> extends RouteOptions {
  auth: ValidAuth;
  validate:
    | {
        payload: Validation<T> | Joi.ObjectSchema<T> | Joi.AlternativesSchema;
      }
    | undefined;
  plugins?: {
    [InMemoryRateLimitingPlugin.pluginName]?: InMemoryRateLimitingOptions;
  };
}

/**
 * A route splat payload that is of the shape:
 *
 * {
 *   handler:
 *   options: {
 *     validate: {
 *       payload: {
 *        ...: Joi.foo()
 *        }
 *     }
 *   }
 * }
 *
 * This allows us to force validation for route definitions.  Other validations are still
 * valid, but payload is now forced to be typed
 */
export interface ValidatedRoute<Req extends object, Resp = unknown, TAuth extends RequestAuth = RequestAuth>
  extends Route<Req, Resp, TAuth> {
  options: Options<Req>;
}
