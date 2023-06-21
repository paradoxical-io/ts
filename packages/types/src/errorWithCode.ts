import { ErrorCode, ErrorData, ErrorPayload } from './errorTypes';
import { notNullOrUndefined } from './nullish';

/**
 * Error object designed for easy programmatic access.
 * ErrorCode is a global enum and is meant to be a high level description of the
 * error that is not specific to any single API.
 * ErrorData is optional and is meant to be used for context-specific errors.
 *
 */
export class ErrorWithCode<T extends ErrorData = ErrorData> extends Error {
  constructor(
    /**
     * code: HTTP mapped code
     */
    public code: ErrorCode,

    public data?: ErrorPayload<T>
  ) {
    super(data?.errorMessage);
    this.name = ErrorWithCode.name;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTraceableError(data: any): data is ErrorWithCode {
  return data.originatingTrace !== undefined && data.code !== undefined;
}

export function isErrorWithCode<T extends ErrorData>(e: Error | unknown): e is ErrorWithCode<T> {
  if (e instanceof ErrorWithCode) {
    return true;
  }

  const looksLikeErrorWithCode = e as ErrorWithCode;

  return looksLikeErrorWithCode.code && notNullOrUndefined(looksLikeErrorWithCode.data);
}
