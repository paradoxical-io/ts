import { Request, RequestRoute, RouteOptionsApp, RouteSettings } from '@hapi/hapi';

export interface RequestWithRoles<Role extends string> extends Request {
  route: RequestRoute & {
    settings: RouteSettings & {
      app: RouteOptionsApp & {
        roles: Role[];
      };
    };
  };
}

export function isRequestWithRoles<Role extends string>(req: Request): req is RequestWithRoles<Role> {
  return (req as RequestWithRoles<Role>).route.settings.app?.roles !== undefined;
}
