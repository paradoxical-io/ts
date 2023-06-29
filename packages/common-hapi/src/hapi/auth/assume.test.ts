import { Server } from '@hapi/hapi';

import { TypedRequest } from '../types';
import { AssumeAuth, AssumeRequestAuth } from './assume';

test('assume auth', async () => {
  const server = new Server();

  await server.register(new AssumeAuth());

  server.route({
    method: 'GET',
    path: '/',
    options: {
      auth: AssumeAuth.scheme,
    },
    handler: (request: TypedRequest<{}, AssumeRequestAuth>, h) => h.response(request.auth.credentials?.user?.id),
  });

  const result = await server.inject({
    method: 'GET',
    url: '/',
    headers: {
      Authorization: 'assume username',
    },
  });

  if (result.result !== undefined) {
    expect(result.result).toEqual('username');
  } else {
    fail('result was undefined');
  }
});
