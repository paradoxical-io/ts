import { Server } from '@hapi/hapi';
import { safeExpect } from '@paradoxical-io/common-test';

import { Bearer, BearerStrategy } from './bearer';

test('bearer auth', async () => {
  const server = new Server();

  await server.register(
    new Bearer({
      ipAllowList: ['127.0.0.1'],
      keyName: 'braze' as BearerStrategy,
      tokenValues: ['braze'],
    })
  );

  await server.register(
    new Bearer({
      ipAllowList: ['127.0.0.1'],
      keyName: 'test' as BearerStrategy,
      tokenValues: ['test'],
    })
  );

  server.route({
    method: 'GET',
    path: '/test',
    options: {
      auth: {
        strategy: 'test',
      },
    },
    handler: () => 'OK',
  });

  server.route({
    method: 'GET',
    path: '/braze',
    options: {
      auth: {
        strategy: 'braze',
      },
    },
    handler: () => 'OK',
  });

  const test = await server.inject({
    method: 'GET',
    url: '/test',
    headers: {
      Authorization: 'Bearer test',
    },
  });

  safeExpect(test.statusCode).toEqual(200);

  const braze = await server.inject({
    method: 'GET',
    url: '/braze',
    headers: {
      Authorization: 'Bearer braze',
    },
  });

  safeExpect(braze.statusCode).toEqual(200);
});
