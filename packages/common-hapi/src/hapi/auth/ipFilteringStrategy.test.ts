import { Server } from '@hapi/hapi';
import { safeExpect } from '@paradoxical-io/common-test';

import { IpFiltering, IpFilteringRouteOptions, IpFilteringStrategy } from './ipFilteringStrategy';

test('ip filtering', async () => {
  const server = new Server();

  await server.register(
    new IpFiltering({
      ipAllowList: ['127.0.0.1'],
      keyName: 'localhost' as IpFilteringStrategy,
    })
  );

  await server.register(
    new IpFiltering({
      ipAllowList: ['127.0.0.2'],
      keyName: 'deny' as IpFilteringStrategy,
    })
  );

  server.route({
    method: 'GET',
    path: '/ok',
    options: {
      auth: {
        strategy: 'localhost',
      },
    },
    handler: () => 'OK',
  });

  server.route({
    method: 'GET',
    path: '/deny',
    options: {
      auth: {
        strategy: 'deny',
      },
    },
    handler: () => 'OK',
  });

  const ok = await server.inject({
    method: 'GET',
    url: '/ok',
  });

  safeExpect(ok.statusCode).toEqual(200);

  const deny = await server.inject({
    method: 'GET',
    url: '/deny',
  });

  safeExpect(deny.statusCode).toEqual(401);
});

test('ip filtering with custom response', async () => {
  const server = new Server();

  await server.register(
    new IpFiltering({
      ipAllowList: ['127.0.0.2'],
      keyName: 'deny' as IpFilteringStrategy,
    })
  );

  server.route({
    method: 'GET',
    path: '/deny',
    options: {
      plugins: {
        [IpFiltering.name]: {
          onFailure: () => ({ ok: true }),
        } as IpFilteringRouteOptions,
      },
      auth: {
        strategy: 'deny',
      },
    },
    handler: () => 'OK',
  });

  const deny = await server.inject({
    method: 'GET',
    url: '/deny',
  });

  safeExpect(deny.statusCode).toEqual(200);
  safeExpect(deny.result).toEqual({ ok: true });
});
