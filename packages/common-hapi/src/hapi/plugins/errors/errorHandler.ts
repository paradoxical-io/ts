import Boom from '@hapi/boom';
import { log } from '@paradoxical-io/common-server';
import {
  ApiError,
  bottom,
  ErrorCode,
  ErrorPayload,
  ErrorWithCode,
  nullOrUndefined,
  UserFacingMessage,
} from '@paradoxical-io/types';

export class Locale {
  maintenance(): UserFacingMessage {
    return 'We’re currently doing a bit of maintenance and we’ll be back in a couple minutes. Sorry for the inconvenience.' as UserFacingMessage;
  }

  tryAgainLater(): UserFacingMessage {
    return 'Lets try this again a little later.' as UserFacingMessage;
  }
}

export class ErrorHandler {
  private locale: Locale;

  private readonly surfaceErrorMessagesOverTheWire: boolean;

  constructor(
    opts: {
      locale?: Locale;
      surfaceErrorMessagesOverTheWire?: boolean;
    } = {}
  ) {
    this.locale = opts.locale ?? new Locale();
    this.surfaceErrorMessagesOverTheWire = opts.surfaceErrorMessagesOverTheWire ?? false;
  }

  mapToBoom(err: Error): Boom.Boom | undefined {
    if (err instanceof ErrorWithCode) {
      switch (err.code) {
        case ErrorCode.ItemAlreadyExists:
          return this.getBoom(409, err.code, err.data);
        case ErrorCode.ItemNotFound:
          return this.getBoom(404, err.code, err.data);
        case ErrorCode.Invalid:
          return this.getBoom(400, err.code, err.data);
        case ErrorCode.NotAllowed:
          return this.getBoom(403, err.code, err.data);
        case ErrorCode.RateExceeded:
          return this.getBoom(429, err.code, {
            ...err.data,
            userFacingMessage: err.data?.userFacingMessage ?? this.locale.tryAgainLater(),
          });
        case ErrorCode.Locked:
          return this.getBoom(423, err.code, err.data);
        case ErrorCode.PreconditionRequired:
          return this.getBoom(428, err.code, err.data);
        default:
          return this.getBoom(500, err.code, err.data);
      }
    }

    // we can't connect to the DB, might be upgrading it or its down
    // can give the user a friendly message
    if (systemMaintenance(err)) {
      return this.getBoom(500, err.code, { userFacingMessage: this.locale.maintenance() });
    }

    return undefined;
  }

  private getBoom(statusCode: number, error: string, errorData?: ErrorPayload): Boom.Boom {
    const b = new Boom.Boom(errorData?.userFacingMessage, { statusCode });

    b.output.payload.error = error;

    let userFacingMessage: UserFacingMessage | undefined = errorData?.userFacingMessage;

    if (this.surfaceErrorMessagesOverTheWire && nullOrUndefined(errorData?.userFacingMessage)) {
      userFacingMessage = errorData?.errorMessage as UserFacingMessage;
    }

    const apiError: ApiError = {
      errorData: errorData?.data,
      locale: userFacingMessage
        ? {
            en: userFacingMessage,
          }
        : undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    b.output.payload = { ...b.output.payload, ...(apiError as any) };
    return b;
  }
}

// Known maintenance codes
export type MaintenanceCodes =
  // db is in read-only mode
  | 'ER_OPTION_PREVENTS_STATEMENT'
  // cant connect to db
  | 'ECONNREFUSED'
  // missing dns entrie (maybe during db swap?)
  | 'ENOTFOUND';

function systemMaintenance(e: unknown): e is { code: MaintenanceCodes } {
  const systemError = e as unknown as { code: MaintenanceCodes };

  if (nullOrUndefined(systemError.code)) {
    return false;
  }

  switch (systemError.code) {
    case 'ER_OPTION_PREVENTS_STATEMENT':
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
      return true;
    default:
      return bottom(systemError.code, never => {
        log.warn(never)

        return false
      });
  }
}
