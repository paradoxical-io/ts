import Boom from '@hapi/boom';
import { Request, Server, UserCredentials } from '@hapi/hapi';
import { asMilli, asSeconds, defaultTimeProvider, isExpired, TimeProvider } from '@paradoxical-io/common';
import { currentEnvironment } from '@paradoxical-io/common-server';
import { EpochMS, Seconds } from '@paradoxical-io/types';
import NodeCache from 'node-cache';

import { SimplePlugin } from './simplePlugin';

export interface InMemoryRateLimitingOptions {
  enabled: boolean;

  /**
   * Array of IPs for whom to bypass rate limiting.
   */
  ipAllowList?: string[];

  limit: {
    maxRequestsPerTimePeriod: number;

    timePeriod: Seconds;
  };
}

interface RequestCache {
  requests: number;
  lastRequestTime: EpochMS;
  creationTime: EpochMS;
}

export class InMemoryRateLimitingPlugin implements SimplePlugin {
  static pluginName = 'in-memory-rate-limiting' as const;

  name = InMemoryRateLimitingPlugin.pluginName;

  constructor(
    private defaultSettings: Partial<InMemoryRateLimitingOptions> = { enabled: false },
    private time: TimeProvider = defaultTimeProvider()
  ) {}

  async register(server: Server): Promise<void> {
    const cache = new NodeCache({
      useClones: false,
      stdTTL: asSeconds(1, 'minutes'),
      deleteOnExpire: true,
      maxKeys: 100000,
    });

    server.ext('onPostAuth', async (request, h) => {
      const routeSettings: InMemoryRateLimitingPlugin =
        // @ts-ignore
        request.route.settings.plugins?.[InMemoryRateLimitingPlugin.pluginName];

      const settings = { ...this.defaultSettings, ...routeSettings };

      if (settings.enabled !== true) {
        return h.continue;
      }

      if (!settings.limit) {
        return h.continue;
      }

      // find how we're going to cache the request. either by user id if we have an authorized request
      // or by ip if we don't
      const field =
        getUser(
          request,
          r =>
            // @ts-ignore
            r?.id
        ) ?? getIP(request, settings.ipAllowList ?? []);

      if (!field) {
        return h.continue;
      }

      const result = cache.get<RequestCache>(field);

      const now = this.time.epochMS();

      const timePeriodMs = asMilli(settings.limit.timePeriod, 'seconds');

      if (!result) {
        cache.set<RequestCache>(field, { creationTime: now, lastRequestTime: now, requests: 1 });
        cache.ttl(field, settings.limit.timePeriod);
      } else {
        const totalRequests = result.requests + 1;

        const expiresAt = result.creationTime + timePeriodMs;

        // the cache does not copy fields, so we can mutate the value in the cache
        result.requests = totalRequests;
        result.lastRequestTime = now;

        // the value in the cache expired, just reset it to 0
        if (isExpired(result.creationTime, settings.limit.timePeriod, 'seconds', this.time)) {
          // delete the previous value
          cache.del(field);

          // set a new value
          cache.set<RequestCache>(field, { creationTime: now, lastRequestTime: now, requests: 1 });

          cache.ttl(field, settings.limit.timePeriod);
        }
        // not expired and the total requests is past our limit
        else if (totalRequests > settings.limit.maxRequestsPerTimePeriod) {
          const millisToReset = expiresAt - now;

          // give a meaningful message if its not prod, otherwise dont tell them
          // how much longer it is
          throw Boom.tooManyRequests(
            currentEnvironment() !== 'prod'
              ? `Please try again in ${asSeconds(millisToReset, 'ms')} seconds`
              : undefined
          );
        }
      }

      return h.continue;
    });
  }
}

function getUser(
  request: Request,
  extractor: (r: UserCredentials | undefined) => string | undefined
): string | undefined {
  if (request.auth.isAuthenticated) {
    const user = extractor(request.auth.credentials.user);
    if (user !== undefined) {
      return user.toString();
    }
  }

  return undefined;
}

function getIP(request: Request, allow: string[], trustProxy = false): string | undefined {
  let ip: string | undefined;

  if (trustProxy && request.headers['x-forwarded-for']) {
    const ips = request.headers['x-forwarded-for'].split(',');
    ip = ips[0];
  }

  if (ip === undefined) {
    ip = request.info.remoteAddress;
  }

  // skip
  if (allow.includes(ip)) {
    return undefined;
  }

  return ip;
}
