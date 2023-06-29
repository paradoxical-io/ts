import { Server } from '@hapi/hapi';

import { SimplePlugin } from './simplePlugin';

const humanizeDuration = require('humanize-duration');

export interface HealthCheck {
  name: string;
  action: () => Promise<void>;
}

interface CheckResult {
  name: string;
  ok: boolean;
}

export class HAPIPing implements SimplePlugin {
  static path = '/api/ping';

  constructor(private checks: HealthCheck[] = []) {}

  register(server: Server) {
    const startDate = new Date();

    // health check ping
    server.route({
      path: HAPIPing.path,
      method: 'GET',
      handler: async () => {
        const now = new Date();
        const duration = now.getTime() - startDate.getTime();

        const checkResults = await Promise.all(
          this.checks.map(c =>
            c
              .action()
              .then(
                () =>
                  ({
                    name: c.name,
                    ok: true,
                  } as CheckResult)
              )
              .catch(e => {
                server.log(`Check failed ${c.name}`, e);

                return {
                  name: c.name,
                  ok: false,
                } as CheckResult;
              })
          )
        );

        if (checkResults.find(i => !i.ok)) {
          throw new Error(`Failed checks exist, failing ping endpoint`);
        }

        return {
          msg: 'PONG',
          start: startDate.toUTCString(),
          now: now.toUTCString(),
          uptime: humanizeDuration(duration),
          env: `${process.env['PARADOX_ENV']}`,
          service: `${process.env['PARADOX_SERVICE_NAME']}`,
          sha: `${process.env['PARADOX_REVISION']}`,
          checkTime: humanizeDuration(new Date().getTime() - now.getTime()),
        };
      },
      options: {
        auth: false,
      },
    });
  }

  name = 'ping';
}
