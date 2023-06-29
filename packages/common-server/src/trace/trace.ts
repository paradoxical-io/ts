import { createNamespace } from 'cls-hooked';
import uuid = require('uuid');

const name = 'correlation_id_tracing';

const ns = createNamespace(name);

export interface OptionalContext {
  [k: string]: string;
}

export interface Trace {
  trace: string;
  subTrace?: string;
}

export const traceID = (): Trace => ({
  trace: ns.get('trace'),
  subTrace: ns.get('subTrace'),
});

/**
 * The current logged in user
 */
export function getCurrentUserId<T extends string>(): T | undefined {
  return ns.get('currentUserId');
}

/**
 * Sets a trace for the current user id available in all async calls and logging methods
 * @param userId
 */
export function setCurrentUserId<T extends string>(userId: T) {
  try {
    ns.set('currentUserId', userId);
  } catch (e) {
    if (process.env.JEST_TEST) {
      // allow this to not be set in tests that dont have a cls created
    } else {
      throw e;
    }
  }
}

export const getOptionalContext = (): OptionalContext | undefined => ns.get('optionalContext');

export function addToOptionalContext(key: string, value: string): void {
  const context = getOptionalContext() ?? {};

  try {
    context[key] = value;

    ns.set('optionalContext', context);
  } catch (e) {
    if (process.env.JEST_TEST) {
      // allow this to not be set in tests that dont have a cls created
    } else {
      throw e;
    }
  }
}

/**
 * Creates a trace context for promises. We can set thread local values on anything in this context
 * @param fun
 * @param trace
 * @param optionalContext
 */
export function withNewTrace<T>(fun: () => T, trace?: string, optionalContext?: OptionalContext): T {
  return ns.runAndReturn<T>((): T => {
    if (trace === undefined) {
      trace = uuid.v4();
    }

    // overarching trace that ties multiple things together
    ns.set('trace', trace);

    // a sub trace for just THIS instance of the trace callback
    ns.set('subTrace', uuid.v4());

    if (optionalContext) {
      ns.set('optionalContext', optionalContext);
    }
    return fun();
  });
}

/**
 * Wrap a function in an implicit trace, used for testing
 * @param fn
 * @param context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindTrace<F extends Function>(fn: F, context?: any): F {
  return ns.bind(fn, context);
}
