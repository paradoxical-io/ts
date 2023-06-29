import { Server } from '@hapi/hapi';
import { safeExpect } from '@paradoxical-io/common-test';

import { Hmac, HmacStrategy } from './hmac';

test('hmac auth verifies', async () => {
  const server = new Server();

  await server.register(
    new Hmac({
      keyName: 'hmac' as HmacStrategy,
      verifier: {
        verify: async () => true,
      },
      verificationType: 'payload',
    })
  );

  server.route({
    method: 'POST',
    path: '/test',
    options: {
      auth: {
        strategy: 'hmac',
        payload: 'required',
      },
    },
    handler: () => 'OK',
  });

  const test = await server.inject({
    method: 'POST',
    url: '/test',
    payload: '123',
  });

  safeExpect(test.statusCode).toEqual(200);
});

test('hmac auth rejects non matching', async () => {
  const server = new Server();

  await server.register(
    new Hmac({
      keyName: 'hmac' as HmacStrategy,
      verifier: {
        verify: async () => false,
      },
      verificationType: 'payload',
    })
  );

  server.route({
    method: 'POST',
    path: '/test',
    options: {
      auth: {
        strategy: 'hmac',
        payload: 'required',
      },
    },
    handler: () => 'OK',
  });

  const test = await server.inject({
    method: 'POST',
    url: '/test',
    payload: '123',
  });

  safeExpect(test.statusCode).toEqual(401);
});
