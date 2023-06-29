// make sure we allow all logging (even if the test runner says otherwise)
import { Server } from '@hapi/hapi';
import { settableTimeProvider } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';

import { AssumeAuth } from '../auth/assume';
import { InMemoryRateLimitingOptions, InMemoryRateLimitingPlugin } from './inMemoryRateLimiting';

process.env.PARADOX_LOG_LEVEL = 'info';

test('Rate limits by ip', async () => {
  const server = new Server();

  const time = settableTimeProvider();

  await server.register(new InMemoryRateLimitingPlugin({ enabled: false }, time));

  server.route({
    method: 'GET',
    path: '/no-limit',
    handler: () => 'OK',
  });

  server.route({
    method: 'GET',
    path: '/limit',
    options: {
      plugins: {
        [InMemoryRateLimitingPlugin.pluginName]: {
          enabled: true,
          limit: {
            timePeriod: 5,
            maxRequestsPerTimePeriod: 1,
          },
        } as InMemoryRateLimitingOptions,
      },
    },
    handler: () => 'OK',
  });

  // should be able to blast a bunch of requests
  for (let i = 0; i < 10; i++) {
    const result = await server.inject({
      method: 'GET',
      url: '/no-limit',
    });

    safeExpect(result.statusCode).toEqual(200);
  }

  const limit1 = await server.inject({
    method: 'GET',
    url: '/limit',
  });

  safeExpect(limit1.statusCode).toEqual(200);

  // all the rest should fail
  for (let i = 0; i < 10; i++) {
    const result = await server.inject({
      method: 'GET',
      url: '/limit',
    });

    safeExpect(result.statusCode).toEqual(429);
  }

  time.addSeconds(20);

  // should be ok now
  const limit2 = await server.inject({
    method: 'GET',
    url: '/limit',
  });

  safeExpect(limit2.statusCode).toEqual(200);
});

test('Rate limits by user when authd', async () => {
  const server = new Server();

  const time = settableTimeProvider();

  await server.register(new InMemoryRateLimitingPlugin({ enabled: false }, time));
  await server.register(new AssumeAuth());

  server.route({
    method: 'GET',
    path: '/no-limit',
    handler: () => 'OK',

    options: {
      auth: false,
    },
  });

  server.route({
    method: 'GET',
    path: '/limit',
    options: {
      auth: AssumeAuth.scheme,
      plugins: {
        [InMemoryRateLimitingPlugin.pluginName]: {
          enabled: true,
          limit: {
            timePeriod: 5,
            maxRequestsPerTimePeriod: 1,
          },
        } as InMemoryRateLimitingOptions,
      },
    },
    handler: () => 'OK',
  });

  // should be able to blast a bunch of requests
  for (let i = 0; i < 10; i++) {
    const result = await server.inject({
      method: 'GET',
      url: '/no-limit',
    });

    safeExpect(result.statusCode).toEqual(200);
  }

  const user1Request1 = await server.inject({
    method: 'GET',
    url: '/limit',
    headers: {
      Authorization: 'assume username',
    },
  });

  safeExpect(user1Request1.statusCode).toEqual(200);

  // all the rest should fail
  for (let i = 0; i < 10; i++) {
    const user1Fails = await server.inject({
      method: 'GET',
      url: '/limit',
      headers: {
        Authorization: 'assume username',
      },
    });

    safeExpect(user1Fails.statusCode).toEqual(429);
  }

  // user 1 failing shouldn't affect user 2
  const user2Request1 = await server.inject({
    method: 'GET',
    url: '/limit',
    headers: {
      Authorization: 'assume username2',
    },
  });

  safeExpect(user2Request1.statusCode).toEqual(200);

  time.addSeconds(20);

  // should be ok now
  const user1RequestLater = await server.inject({
    method: 'GET',
    url: '/limit',
    headers: {
      Authorization: 'assume username',
    },
  });

  safeExpect(user1RequestLater.statusCode).toEqual(200);
});
