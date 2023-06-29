import Boom from '@hapi/boom';
import { Lifecycle, Request, RequestAuth as HapiRequestAuth, Server, ServerAuthSchemeObject } from '@hapi/hapi';
import { currentEnvironment } from '@paradoxical-io/common-server';
import { Env } from '@paradoxical-io/types';

import { SimplePlugin } from '../plugins';
import * as raw from '../types';

export type EnvAuthStrategy = Env;

interface EnvAuthConfig {
  /**
   * The env to restrict authentication to. Also used to identify the scheme
   */
  env: EnvAuthStrategy;
}

export interface EnvRequestAuth extends HapiRequestAuth {}

type Auth = EnvRequestAuth;

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
 * An authentication scheme that only authenticates for the specific env
 */
export class EnvAuth implements SimplePlugin {
  static devAuthStrategy: EnvAuthStrategy = 'dev';

  static prodAuthStrategy: EnvAuthStrategy = 'prod';

  static localAuthStrategy: EnvAuthStrategy = 'local';

  name = 'env-auth';

  multiple = true;

  constructor(private options: EnvAuthConfig) {}

  async register(server: Server): Promise<void> {
    server.auth.scheme(`${EnvAuth}.${this.options.env}`, () => this.auth());

    server.auth.strategy(this.options.env, `${EnvAuth}.${this.options.env}`);
  }

  auth(): ServerAuthSchemeObject {
    return {
      authenticate: async (request: Request, h): Promise<Lifecycle.ReturnValue> => {
        if (currentEnvironment() !== this.options.env) {
          return Boom.unauthorized();
        }

        return h.authenticated({ credentials: {} });
      },
    };
  }
}
