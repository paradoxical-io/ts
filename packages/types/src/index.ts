import { ErrorData, UserFacingMessage } from './errorTypes';

export type Env = 'local' | 'dev' | 'prod';

export * from './address';
export * from './brands';
export * from './date';
export * from './doOnce';
export * from './encryption';
export * from './errorTypes';
export * from './errorWithCode';
export * from './exceptions';
export * from './exhaustiveness';
export * from './json';
export * from './keys';
export * from './nullish';
export * from './pii';
export * from './types';
export * from './util';

export interface Envelope<T> {
  /** the http status code */
  statusCode: number;

  /** the error name */
  error?: string;

  /** service supplied custom data */
  errorData?: ErrorData;

  /** a loggable error message */
  message?: string;

  /** the data if the call succeeds */
  data?: T;

  locale?: {
    /** displayable user facing message */
    en: UserFacingMessage;
  };
}
