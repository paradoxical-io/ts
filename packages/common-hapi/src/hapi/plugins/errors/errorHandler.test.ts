// make sure we allow all logging (even if the test runner says otherwise)
process.env.PARADOX_LOG_LEVEL = 'info';

import { Server } from '@hapi/hapi';
import { safeExpect } from '@paradoxical-io/common-test';
import { Envelope, ErrorCode, ErrorWithCode, UserFacingMessage } from '@paradoxical-io/types';

import { HAPIErrorHandler } from '../index';
import { ErrorHandler, Locale, MaintenanceCodes } from './errorHandler';

test('error handler maps unknowns to 500', async () => {
  const server = new Server();

  await server.register(new HAPIErrorHandler());

  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      throw new Error('foo');
    },
  });

  const result = await server.inject({
    method: 'GET',
    url: '/',
  });

  if (result.statusCode !== 500) {
    fail(`status code was not 500, was ${result.statusCode}`);
  }
});

test('error handler maps 429s with standard locale message', async () => {
  const server = new Server();

  await server.register(new HAPIErrorHandler());

  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      throw new ErrorWithCode(ErrorCode.RateExceeded);
    },
  });

  const result = await server.inject({
    method: 'GET',
    url: '/',
  });

  if (result.statusCode !== 429) {
    fail(`status code was not 429, was ${result.statusCode}`);
  }

  const response: Partial<Envelope<{}>> = {
    locale: {
      en: new Locale().tryAgainLater(),
    },
  };

  safeExpect(JSON.parse(result.payload)).toMatchObject(response);
});

test.each(['ER_OPTION_PREVENTS_STATEMENT', 'ECONNREFUSED', 'ENOTFOUND'] as MaintenanceCodes[])(
  'Returns maintenance message for system errors %j',
  async code => {
    const server = new Server();

    await server.register(new HAPIErrorHandler());

    server.route({
      method: 'GET',
      path: '/',
      handler: () => {
        throw new (class SystemError extends Error {
          public code = code;
        })();
      },
    });

    const result = await server.inject({
      method: 'GET',
      url: '/',
    });

    const response: Partial<Envelope<{}>> = {
      locale: {
        en: new Locale().maintenance(),
      },
    };

    safeExpect(JSON.parse(result.payload)).toMatchObject(response);
  }
);

test('error handler maps unknown paths to 404', async () => {
  const server = new Server();

  await server.register(new HAPIErrorHandler());

  const result = await server.inject({
    method: 'GET',
    url: '/asdf',
  });

  if (result.statusCode !== 404) {
    fail(`status code was not 404, was ${result.statusCode}`);
  }
});

/**
 * These tests ensure our wire format stays consistent for all our error handling
 * We cannot change the shape of the underlying wire format!
 */
test.each([
  [ErrorCode.Invalid, 400],
  [ErrorCode.NotAllowed, 403],
  [ErrorCode.ItemNotFound, 404],
  [ErrorCode.ItemAlreadyExists, 409],
  [ErrorCode.Locked, 423],
])('Maps internal code %j to %j', async (errorCode, httpCode) => {
  const server = new Server();

  await server.register(new HAPIErrorHandler());

  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      throw new ErrorWithCode(errorCode, {
        data: { foo: 'bar' },
        errorMessage: 'internal not visible',
        userFacingMessage: 'foobar' as UserFacingMessage,
      });
    },
  });

  const loggerSpy = jest.spyOn(process.stdout, 'write');

  const result = await server.inject({
    method: 'GET',
    url: '/',
  });

  if (result.statusCode !== httpCode) {
    fail(`status code was not ${httpCode}, was ${result.statusCode}`);
  }

  const logged = JSON.parse(loggerSpy.mock.calls[0][0].toString());

  const response = {
    statusCode: httpCode,
    error: errorCode,
    errorData: { foo: 'bar' },
    // note that the message is a copy of the localized en data
    // the not visible thrown message will be logged but not returned over the wire
    message: 'foobar',
    locale: {
      en: 'foobar',
    },
  };

  // since the response is string encoded parse it again
  safeExpect(JSON.parse(logged.response)).toMatchObject(response);

  // ensure we logged a message with the internal not visible data
  safeExpect(logged.message).toContain('Error handled by HAPI on /. internal not visible');

  safeExpect(JSON.parse(result.payload)).toMatchObject(response);
});

test('error handler surfaces error message over the wire', async () => {
  const server = new Server();

  await server.register(
    new HAPIErrorHandler(
      new ErrorHandler({
        surfaceErrorMessagesOverTheWire: true,
      })
    )
  );

  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      throw new ErrorWithCode(ErrorCode.Invalid, {
        data: { foo: 'bar' },
        errorMessage: 'internal not visible',
      });
    },
  });

  const result = await server.inject({
    method: 'GET',
    url: '/',
  });

  const response: Partial<Envelope<{}>> = {
    locale: {
      en: 'internal not visible' as UserFacingMessage,
    },
  };

  safeExpect(JSON.parse(result.payload)).toMatchObject(response);
});
