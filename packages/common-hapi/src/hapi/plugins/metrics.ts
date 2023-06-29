import { PluginBase, PluginNameVersion, Server, Util } from '@hapi/hapi';
import { MetricEmitter } from '@paradoxical-io/common-server';

import { ServerApplicationState } from '../server/applicationState';
import { isBoom } from '../util';
import { HAPIPing } from './ping';
import Dictionary = Util.Dictionary;

interface HAPIOpts {
  metrics: MetricEmitter;
  statName: string;
}

export class HAPIMetrics implements PluginBase<void>, PluginNameVersion {
  constructor(private opts: HAPIOpts) {}

  name = 'metrics';

  normalizePath(path: string) {
    path = path.indexOf('/') === 0 ? path.substr(1) : path;
    return path.replace(/\//g, '_');
  }

  register(server: Server) {
    server.ext('onPreResponse', async (request, h) => {
      const start = new Date(request.info.received);
      const end = new Date();

      let code: number;
      if (isBoom(request.response)) {
        code = request.response.output.statusCode;
      } else {
        code = request.response.statusCode;
      }

      const durationMs = end.getTime() - start.getTime();

      this.opts.metrics.timing(this.opts.statName, durationMs, {
        code: code.toString(),
        method: request.method,
        // emit the normalized path for metrics (sans parameterized data)
        ...(code === 404 ? undefined : { path: this.normalizePath(request.route.path) }),
      });

      // don't log the authorization header
      const deniedHeaders = new Set(['authorization']);

      const allowedHeaders: Dictionary<string> = {};
      for (const headersKey in request.headers) {
        if (!deniedHeaders.has(headersKey)) {
          allowedHeaders[headersKey] = request.headers[headersKey];
        }
      }

      const log = () => {
        // log duration  in nanoseconds so datadog timing plays nice
        // the other keys are marked as standard datadog log facets, don't rename them
        request.log([`code=${code} path=${request.path} method=${request.method} durationMS=${durationMs}`], {
          http_code: code,
          http_path: request.path, // log the full path
          http_method: request.method,
          duration: durationMs * 1000000,
          // @ts-ignore
          userId: (request.app as ServerApplicationState).userId,
          ...allowedHeaders,
        });
      };

      // only log if the path is NOT ping or if it is ping if the duration > 10. We expect ping to
      // to be extremely fast so a 10ms response time probably indicates we are overloaded or otherwise having issues
      // metrics for ping are captured above so logging doesn't give us much here other than a log'd heartbeat
      if (request.path !== HAPIPing.path) {
        log();
      } else if (durationMs > 10) {
        log();
      }

      return h.continue;
    });
  }
}
