// make sure we allow all logging (even if the test runner says otherwise)
process.env.PARADOX_LOG_LEVEL = 'info';

import 'reflect-metadata';

import { ServerRoute } from '@hapi/hapi';
import { isLocal, log, Metrics, useTestMetrics } from '@paradoxical-io/common-server';
import { safeExpect } from '@paradoxical-io/common-test';
import { ErrorCode, ErrorWithCode } from '@paradoxical-io/types';
import Joi from 'joi';

import { AssumeAuth } from '../auth/assume';
import { HealthCheck, SimplePlugin } from '../plugins';
import { HAPIRoute, HAPIRoutes } from '../routable';
import { testAssumeAuth } from '../util';
import { Server } from './server';

describe('api tests', () => {
  test('ping', async () => {
    const server = new Server();

    await server.start(true);

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'GET',
    });

    expect(result.statusCode).toEqual(200);
    expect(JSON.parse(result.payload).msg).toEqual('PONG');
  });

  test('ping fails if health checks fail', async () => {
    const server = new Server({
      routables: [
        {
          routeName: 'test',
          async close(): Promise<void> {},

          healthCheck(): HealthCheck | undefined {
            return {
              name: 'test',
              action: () => {
                throw new Error('fail');
              },
            };
          },

          async plugins(): Promise<SimplePlugin[]> {
            return [];
          },

          getRoutes(): HAPIRoute[] {
            return [];
          },
        },
      ],
    });

    await server.start(true);

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'GET',
    });

    expect(result.statusCode).toEqual(500);
  });

  test('ping succeeds if health checks succeeds', async () => {
    const server = new Server({
      routables: [
        {
          routeName: 'test',
          async close(): Promise<void> {},

          healthCheck(): HealthCheck | undefined {
            return {
              name: 'test',
              action: async () => {},
            };
          },

          async plugins(): Promise<SimplePlugin[]> {
            return [];
          },

          getRoutes(): HAPIRoute[] {
            return [];
          },
        },
      ],
    });

    await server.start(true);

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'GET',
    });

    expect(result.statusCode).toEqual(200);
    expect(JSON.parse(result.payload).msg).toEqual('PONG');
  });

  test('logs bad request validation if user is authenticated', async () => {
    const server = new Server();

    await server.hapi.register(new AssumeAuth());

    server.hapi.route({
      method: 'POST',
      path: '/api/ping',
      handler: () => 'OK',
      options: {
        auth: AssumeAuth.scheme,
        validate: {
          payload: {
            value: Joi.string().required(),
          },
        },
      },
    });

    await server.start(true);

    const stdout = jest.spyOn(process.stdout, 'write');
    stdout.mockClear();

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'POST',
      headers: {
        ...testAssumeAuth(),
      },
    });

    expect(result.statusCode).toEqual(400);
    expect(result.result).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request payload input',
    });

    // validate we logged the error
    expect(JSON.parse(stdout.mock.calls[0][0].toString()).errMessage).toEqual(`"value" must be of type object`);
  });

  test('logs bad request and redacts passwords', async () => {
    const server = new Server();

    await server.hapi.register(new AssumeAuth());

    server.hapi.route({
      method: 'POST',
      path: '/api/ping',
      handler: () => 'OK',
      options: {
        auth: AssumeAuth.scheme,
        validate: {
          payload: {
            value: Joi.string().required(),
          },
        },
      },
    });

    await server.start(true);

    const stdout = jest.spyOn(process.stdout, 'write');
    stdout.mockClear();

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'POST',
      payload: {
        password: 'bad',
        nested: {
          ssn: 'bad',
          password: 'bad',
        },
        good: 'ok',
      },
      headers: {
        ...testAssumeAuth(),
      },
    });

    expect(result.statusCode).toEqual(400);
    expect(result.result).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request payload input',
    });

    // validate we logged the error
    expect(JSON.parse(stdout.mock.calls[1][0].toString()).message).toEqual(
      `Full payload: {"payload":{"password":"<redactable(bad)>","nested":{"ssn":"<redactable(bad)>","password":"<redactable(bad)>"},"good":"ok"}}`
    );
  });

  test('throws error code on validation', async () => {
    const server = new Server();

    server.hapi.route({
      method: 'POST',
      path: '/api/ping',
      handler: () => 'OK',
      options: {
        auth: AssumeAuth.scheme,
        validate: {
          payload: {
            value: Joi.string().required(),
          },
        },
      },
    });
    await server.start(true);

    const stdout = jest.spyOn(process.stdout, 'write');
    stdout.mockClear();

    const result = await server.hapi.inject({
      url: '/api/ping',
      method: 'POST',
    });

    expect(result.statusCode).toEqual(400);
    expect(result.result).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request payload input',
    });

    const allLogs = stdout.mock.calls.flatMap(i => i.map(j => j!.toString())).join(' ');

    // the 400 log message always logs
    safeExpect(allLogs).toContain('Invalid request payload');

    // validate we DID NOT log the full payload for a non auth'd user if we're remote, otherwise we did log it for local
    if (isLocal) {
      safeExpect(allLogs).toContain('Full payload');
    } else {
      safeExpect(allLogs).not.toContain('Full payload');
    }
  });

  test('http metrics are captured on success', async () => {
    await useTestMetrics(async metrics => {
      const server = new Server({
        metrics,
      });

      await server.start(true);

      await server.hapi.inject({
        url: '/api/ping',
        method: 'GET',
      });

      expect(metrics.mockBuffer).toHaveLength(1);

      if (metrics.mockBuffer !== undefined) {
        expect(metrics.mockBuffer[0]).toContain('200');
      }
    });
  });

  test('http metrics are captured on failure', async () => {
    await useTestMetrics(async metrics => {
      const server = new Server({ metrics });

      await server.start(true);

      await server.hapi.inject({
        url: '/api/missing',
        method: 'GET',
      });

      expect(metrics.mockBuffer).toHaveLength(1);

      if (Metrics.instance.mockBuffer !== undefined) {
        expect(metrics.mockBuffer![0]).toContain('404');
      }
    });
  });

  test('errors are mapped', async () => {
    await useTestMetrics(async metrics => {
      const routable: HAPIRoutes<ServerRoute> = {
        async close() {
          // nothing
        },

        healthCheck(): HealthCheck | undefined {
          return undefined;
        },

        async plugins(): Promise<SimplePlugin[]> {
          return [];
        },

        getRoutes(): ServerRoute[] {
          return [
            {
              method: 'GET',
              path: '/test/fail',
              handler: () => {
                log.info('throwing error');

                throw new ErrorWithCode(ErrorCode.ItemAlreadyExists);
              },
            },
          ];
        },

        routeName: 'test',
      };

      const server = new Server({ routables: [routable], metrics });

      await server.start(true);

      const response = await server.hapi.inject({
        url: '/test/fail',
        method: 'GET',
      });

      expect(response.statusCode).toEqual(409);
    });
  });
});
