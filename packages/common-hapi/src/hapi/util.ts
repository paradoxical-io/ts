import Boom from '@hapi/boom';
import { Request, ResponseObject, Server, ServerInjectOptions, ServerInjectResponse, Util } from '@hapi/hapi';
import { asBrandSafe } from '@paradoxical-io/common';
import { Envelope } from '@paradoxical-io/types';

/**
 * Wrap data in the response envelope. This should be used only for
 * happy path responses with data. User EmptyEnvelope for no-content 204.
 * Use Hapi.Boom for 4xx, 5xx
 */
export const envelope = <T>(data: T, statusCode = 200): Envelope<T> => ({
  statusCode,
  data,
});

/**
 * To be used for a successful call that returns no data. This is a bit of an abuse of
 * 204 since it's returning a payload, but the payload is all metadata. Data is initialized
 * to make it easy on the client to check success by verifying the existence of data.
 */
export const emptyEnvelope: Envelope<{}> = {
  statusCode: 204,
  data: {},
};

/**
 * Does a type guard on a request.response object to determine if its a boom error or not
 * @param r
 */
export function isBoom(r: ResponseObject | Boom.Boom): r is Boom.Boom {
  return (r as Boom.Boom).isBoom !== undefined;
}

/**
 * Returns typed data from a hapi request
 * @param hapi
 * @param options
 * @param expectedCode
 */
export async function testInject<T>(
  hapi: Server,
  options: string | ServerInjectOptions,
  expectedCode?: number
): Promise<ServerInjectResponse & { result: { data?: T } }> {
  const result = await hapi.inject(options);

  if (!expectedCode && result.statusCode >= 300) {
    fail(result.raw);
  }

  if (expectedCode && expectedCode !== result.statusCode) {
    fail(result.raw);
  }

  // @ts-ignore
  return result;
}

/**
 * Returns an auth header for test using the assume scheme
 * @param id
 */
export function testAssumeAuth(id = 'username') {
  return {
    Authorization: `assume ${id}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getClientIP(req: Request): string | undefined {
  const xForwardedFor = req.headers['x-forwarded-for'];
  return asBrandSafe(xForwardedFor ? xForwardedFor.split(',')[0] : req.info.remoteAddress);
}

/**
 * Safer method to get headers from hapi requests
 * @param headers
 * @param key
 */
export function getHeader<T extends string>(headers: Util.Dictionary<string>, key: string): T | undefined {
  return headers[key.toLowerCase()] as T | undefined;
}
