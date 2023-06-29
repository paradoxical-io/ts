import Boom from '@hapi/boom';
import { Lifecycle, Request, RequestAuth as HapiRequestAuth, Server, ServerAuthSchemeObject } from '@hapi/hapi';
import { Brand } from '@paradoxical-io/types';

import { SimplePlugin } from '../plugins';
import * as raw from '../types';
import { assertIpFiltering } from './ipFiltering';

export type HmacStrategy = Brand<string, 'HmacStrategy'>;

export interface HmacVerifier {
  verify(req: Request): Promise<boolean>;
}

interface HmacConfig {
  /**
   * A way to identify this security model. Used to unique register the plugin with hapi
   */
  keyName: HmacStrategy;

  /**
   * Optional list of originating IP's (or forward fors) to allow through
   * any IP not in this list will be automatically denied
   */
  ipAllowList?: string[];

  /**
   * The location of the HMAC relevant data, either in the payload or from query parameters. This is usually on the payload,
   * but can be on the query parameters to validate a GET request. Those requests never hit the HAPI payload validation method.
   */
  verificationType: 'payload' | 'query';

  /**
   * How to extract and verify
   */
  verifier: HmacVerifier;
}

export interface HmacRequestAuth extends HapiRequestAuth {}

type Auth = HmacRequestAuth;

/**
 * A request that has a typed payload and a typed authorization payload
 */
export type TypedRequest<TPayload extends object> = raw.TypedRequest<TPayload, Auth>;

/**
 * For use if there is no payload expected.
 */
export type EmptyTypedRequest = raw.EmptyTypedRequest<Auth>;

export type ValidatedRoute<Req extends object, Resp> = raw.ValidatedRoute<Req, Resp, Auth>;

export type ValidatedRouteNoResp<Req extends object> = raw.ValidatedRoute<Req, {}, Auth>;

export type Route<Req extends object, Resp> = raw.Route<Req, Resp, Auth>;

export type RouteNoResp<Req extends object> = raw.Route<Req, {}, Auth>;

/**
 * Register a hmac token keyed off the name.  This allows endpoints to configure themselves like
 *
 * "I use hmac configuration Braze" where keyName=braze and the key value is the hmac token to expect
 *
 * Handlers will register themselves with the strategy of "braze"
 */
export class Hmac implements SimplePlugin {
  name = 'hmac-auth';

  multiple = true;

  constructor(private options: HmacConfig) {}

  async register(server: Server): Promise<void> {
    server.auth.scheme(`${Hmac}.${this.options.keyName}`, () => this.auth());

    // map the strategy name to the hmac implementation
    // this means that when a route uses the auth scheme in its options block
    // it can provide the auth name as whatever the value the keyName is.
    // hapi then knows how to map that key name to the actual scheme listed above, which then maps to
    // the auth implementation
    server.auth.strategy(this.options.keyName, `${Hmac}.${this.options.keyName}`);
  }

  auth(): ServerAuthSchemeObject {
    return {
      options: {
        payload: true, // without this we don't have access to the payload during auth
      },
      authenticate: async (request: Request, h): Promise<Lifecycle.ReturnValue> => {
        const filteredIp = assertIpFiltering(request, this.options.ipAllowList);

        if (filteredIp) {
          return filteredIp;
        }

        if (this.options.verificationType === 'query') {
          if (!(await this.options.verifier.verify(request))) {
            return Boom.unauthorized();
          }
        }

        return h.authenticated({ credentials: {} });
      },
      payload: async (request, h): Promise<Lifecycle.ReturnValue> => {
        if (this.options.verificationType !== 'payload') {
          return h.continue;
        }

        if (!(await this.options.verifier.verify(request))) {
          return Boom.unauthorized();
        }

        return h.continue;
      },
    };
  }
}
