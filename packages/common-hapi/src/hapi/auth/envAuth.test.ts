import { Server } from '@hapi/hapi';
import { currentEnvironment } from '@paradoxical-io/common-server';
import { safeExpect, usingEnv } from '@paradoxical-io/common-test';
import { Env } from '@paradoxical-io/types';

import { EnvAuth } from './envAuth';

test.each([['local'], ['dev'], ['prod']] as Array<[Env]>)('%j env auth verifies', async (env: Env) => {
  const server = new Server();

  await server.register(
    new EnvAuth({
      env,
    })
  );

  server.route({
    method: 'GET',
    path: '/test',
    options: {
      auth: {
        strategy: env,
      },
    },
    handler: () => 'OK',
  });

  await usingEnv('local', async () => {
    const test = await server.inject({
      method: 'GET',
      url: '/test',
    });
    safeExpect(test.statusCode).toEqual(env === currentEnvironment() ? 200 : 401);
  });

  await usingEnv('dev', async () => {
    const test = await server.inject({
      method: 'GET',
      url: '/test',
    });
    safeExpect(test.statusCode).toEqual(env === currentEnvironment() ? 200 : 401);
  });

  await usingEnv('prod', async () => {
    const test = await server.inject({
      method: 'GET',
      url: '/test',
    });
    safeExpect(test.statusCode).toEqual(env === currentEnvironment() ? 200 : 401);
  });
});
