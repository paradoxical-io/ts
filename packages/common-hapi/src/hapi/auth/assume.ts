import Boom from '@hapi/boom';
import { Lifecycle, RequestAuth, Server, ServerAuthSchemeObject } from '@hapi/hapi';

import { SimplePlugin } from '../plugins/simplePlugin';
import { getHeader } from '../util';

export interface AssumeCredentials {
  id: string;
}

export interface AssumeRequestAuth extends RequestAuth<AssumeCredentials> {}

export class AssumeAuth implements SimplePlugin {
  static readonly scheme = 'assume';

  name = 'assume-auth';

  auth = (_: Server): ServerAuthSchemeObject => {
    const creds = (name: string): AssumeCredentials => ({
      id: name,
    });

    return {
      authenticate: (request, h): Lifecycle.ReturnValue => {
        const auth = getHeader(request.headers, 'authorization');

        if (!auth) {
          return Boom.unauthorized();
        }

        const [scheme, name] = auth.split(' ');

        if (scheme !== AssumeAuth.scheme) {
          return Boom.unauthorized(`Auth scheme should be 'assume', but was ${scheme}`);
        }

        return h.authenticated({
          credentials: {
            user: creds(name),
          },
        });
      },
    };
  };

  register(server: Server): void {
    server.auth.scheme(AssumeAuth.scheme, this.auth);
    server.auth.strategy(AssumeAuth.scheme, AssumeAuth.scheme);
  }
}
