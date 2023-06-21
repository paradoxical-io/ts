import { NotImplementedError } from '@paradox/types';
import _ from 'lodash';

interface ErrorWithCode {
  code: string;
  data?: {
    userFacingMessage?: string;
    data?: {
      errorCode?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } & { [k: string]: any };
  };
}

declare global {
  /* tslint:disable:no-unused-declaration */
  namespace jest {
    interface Matchers<R> {
      logToCli(): R;

      matchesErrorWithCode(b: ErrorWithCode, opts?: { verifyUserMessage?: boolean }): R;

      matchesUserFacingMessage(b: ErrorWithCode): R;

      matchesNotImplementedError(b: NotImplementedError): R;

      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

/**
 * Extend jest. Delegated as a method so we don't pollute the global space (which causes issues with oclif manifest generation scanning files)
 */
export function extendJest() {
  expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
      const pass = received >= floor && received <= ceiling;
      if (pass) {
        return {
          message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
          pass: true,
        };
      }
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    },

    /**
     * Safe util to log anything to console bypassing linting errors. Only available for test code
     * @param a
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logToCli(a: any) {
      // eslint-disable-next-line no-console
      console.log(a);

      return {
        message: () => '',
        pass: true,
      };
    },

    /**
     * Match the error between a and b but ignore the custom provided text. Only checks error details and code
     * @param a
     * @param b
     */
    matchesErrorWithCode(a: ErrorWithCode, b: ErrorWithCode, opts?: { verifyUserMessage?: boolean }) {
      if (a.code === b.code && _.isEqual(a.data?.data, b.data?.data)) {
        if (opts?.verifyUserMessage) {
          expect(a).matchesUserFacingMessage(b);
        }

        return {
          message: () => `${JSON.stringify(a)} matches ${JSON.stringify(b)}`,
          pass: true,
        };
      }

      return {
        message: () =>
          `${JSON.stringify({ code: a.code, data: a.data })} does not match ${JSON.stringify({
            code: b.code,
            data: b.data,
          })}`,
        pass: false,
      };
    },

    /**
     * Ensures that the error's user facing message matches
     * @param a
     * @param b
     */
    matchesUserFacingMessage(a: ErrorWithCode, b: ErrorWithCode) {
      if (a.data?.userFacingMessage === b.data?.userFacingMessage) {
        return {
          message: () => `${JSON.stringify(a)} matches ${JSON.stringify(b)}`,
          pass: true,
        };
      }

      return {
        message: () => `${a?.data?.userFacingMessage} does not match ${b.data?.userFacingMessage}`,
        pass: false,
      };
    },

    matchesNotImplementedError(a: Error, b: NotImplementedError) {
      if (a instanceof NotImplementedError) {
        return {
          message: () => `${JSON.stringify(a)} matches ${JSON.stringify(b)}`,
          pass: true,
        };
      }

      return {
        message: () => `${JSON.stringify(a)} does not match ${JSON.stringify(b)}`,
        pass: false,
      };
    },
  });
}
