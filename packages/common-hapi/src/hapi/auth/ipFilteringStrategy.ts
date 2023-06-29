import {
  Lifecycle,
  Request,
  RequestAuth as HapiRequestAuth,
  ResponseValue,
  Server,
  ServerAuthSchemeObject,
} from '@hapi/hapi';
import { Brand } from '@paradoxical-io/types';

import { SimplePlugin } from '../plugins';
import * as raw from '../types';
import { assertIpFiltering } from './ipFiltering';

export type IpFilteringStrategy = Brand<string, 'IpFilteringStrategy'>;

interface IpFilteringConfig {
  /**
   * A way to identify this security model. Used to unique register the plugin with hapi
   */
  keyName: IpFilteringStrategy;

  /**
   * Optional list of originating IP's (or forward fors) to allow through
   * any IP not in this list will be automatically denied
   */
  ipAllowList: string[];
}

export interface IpFilteringRouteOptions {
  /**
   * If the IP fails how to specifically respond
   * @param req
   */
  onFailure?: (req: Request) => ResponseValue;
}

export interface IpFilteringRequestAuth extends HapiRequestAuth {}

type Auth = IpFilteringRequestAuth;

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
 * Register a key name.  This allows endpoints to configure themselves like
 *
 * "I use ip filtering configuration Appsflyer" where keyName=appsflyer and then the list of allowed ips
 *
 * Handlers will register themselves with the strategy of "appsflyer"
 */
export class IpFiltering implements SimplePlugin {
  name = 'ip-auth';

  multiple = true;

  constructor(private options: IpFilteringConfig) {}

  async register(server: Server): Promise<void> {
    server.auth.scheme(`${IpFiltering}.${this.options.keyName}`, () => this.auth());

    // map the strategy name to the hmac implementation
    // this means that when a route uses the auth scheme in its options block
    // it can provide the auth name as whatever the value the keyName is.
    // hapi then knows how to map that key name to the actual scheme listed above, which then maps to
    // the auth implementation
    server.auth.strategy(this.options.keyName, `${IpFiltering}.${this.options.keyName}`);
  }

  auth(): ServerAuthSchemeObject {
    return {
      authenticate: (request: Request, h): Lifecycle.ReturnValue => {
        const boom = assertIpFiltering(request, this.options.ipAllowList);

        if (boom) {
          const routeSettings: IpFilteringRouteOptions =
            // @ts-ignore
            request.route.settings.plugins?.[IpFiltering.name];

          if (routeSettings?.onFailure) {
            return h.response(routeSettings.onFailure(request)).takeover();
          }

          return boom;
        }

        return h.authenticated({ credentials: {} });
      },
    };
  }
}
