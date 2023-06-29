import Boom from '@hapi/boom';
import { Lifecycle, RequestAuth as HapiRequestAuth, Server, ServerAuthSchemeObject } from '@hapi/hapi';
import { Brand } from '@paradoxical-io/types';

import { SimplePlugin } from '../plugins';
import * as raw from '../types';
import { assertIpFiltering } from './ipFiltering';

export type BearerStrategy = Brand<string, 'BearerStrategy'>;

interface BearerConfig {
  /**
   * A way to identify this security model. Used to unique register the plugin with hapi
   */
  keyName: BearerStrategy;

  /**
   * Set of valid tokens that will match the bearer auth header
   */
  tokenValues: string[];

  /**
   * Optional list of originating IP's (or forward fors) to allow through
   * any IP not in this list will be automatically denied
   */
  ipAllowList: string[] | undefined;
}

export interface BearerRequestAuth extends HapiRequestAuth {}

type Auth = BearerRequestAuth;

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
 * Register a bearer token keyed off the name.  This allows endpoints to configure themselves like
 *
 * "I use bearer configuration Braze" where keyName=braze and the key value is the bearer token to expect
 *
 * Handlers will register themselves with the strategy of "braze"
 */
export class Bearer implements SimplePlugin {
  name = 'bearer-auth';

  multiple = true;

  constructor(private options: BearerConfig) {}

  async register(server: Server): Promise<void> {
    server.auth.scheme(`${Bearer}.${this.options.keyName}`, () => this.auth());

    // map the strategy name to the bearer implementation
    // this means that when a route uses the auth scheme in its options block
    // it can provide the auth name as whatever the value the keyName is.
    // hapi then knows how to map that key name to the actual scheme listed above, which then maps to
    // the auth implementation
    server.auth.strategy(this.options.keyName, `${Bearer}.${this.options.keyName}`);
  }

  auth(): ServerAuthSchemeObject {
    return {
      authenticate: (request, h): Lifecycle.ReturnValue => {
        const filteredIp = assertIpFiltering(request, this.options.ipAllowList);
        if (filteredIp) {
          return filteredIp;
        }

        const auth = request.headers['authorization'];

        if (!auth) {
          return Boom.unauthorized();
        }

        const [headerAuthType, value] = auth.split(' ');

        if (headerAuthType !== 'Bearer' || !this.options.tokenValues?.includes(value)) {
          return Boom.unauthorized();
        }

        return h.authenticated({
          credentials: {},
        });
      },
    };
  }
}
