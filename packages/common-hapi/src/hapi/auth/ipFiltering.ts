import Boom from '@hapi/boom';
import { Lifecycle, Request } from '@hapi/hapi';

export function assertIpFiltering(
  request: Request,
  ipAllowList: string[] | undefined
): Lifecycle.ReturnValue | undefined {
  const forwardedFor = request.headers['x-forwarded-for'];

  const originalIp = forwardedFor ? forwardedFor.split(',')[0] : request.info.remoteAddress;

  if (ipAllowList && !ipAllowList.includes(originalIp)) {
    return Boom.unauthorized();
  }

  return undefined;
}
