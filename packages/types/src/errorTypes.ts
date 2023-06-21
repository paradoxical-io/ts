import { Brand } from './brands';

export enum ErrorCode {
  /**
   * Maps to HTTP 404
   */
  ItemNotFound = 'item_not_found',

  /**
   * Maps to HTTP 409
   */
  ItemAlreadyExists = 'item_already_exists',

  /**
   * Maps to HTTP 400
   */
  Invalid = 'invalid',

  /**
   * If a lock for a resource cannot be acquired
   *
   * Maps to HTTP 423
   */
  Locked = 'locked',

  /**
   * Rate limited
   *
   * Maps to HTTP 429
   */
  RateExceeded = 'rate_exceeded',

  /**
   * Operation is not allowed. Maps to HTTP 403
   */
  NotAllowed = 'not_allowed',

  /**
   * Conditions were not met for this call. Maps to HTTP 428
   */
  PreconditionRequired = 'precondition_required',
}

export type UserFacingMessage = Brand<string, 'UserFacingMessage'>;

export interface ErrorData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * The over the wire payload that we map from our services
 */
export interface ApiError<T extends ErrorData = ErrorData> {
  /**
   * Custom data
   */
  errorData?: T;

  /**
   * Publicly consumable message
   */
  locale?: {
    en: UserFacingMessage;
  };
}

/**
 * The intermediate payload services can throw
 */
export interface ErrorPayload<T extends ErrorData = ErrorData> {
  /**
   * Custom structured data that will be surfaced over the wire
   */
  data?: T;

  /**
   * Loggable friendly message. This will not be surfaced over the wire however.
   */
  errorMessage?: string;

  /**
   * User facing message to be consumed over the wire
   */
  userFacingMessage?: UserFacingMessage;
}
