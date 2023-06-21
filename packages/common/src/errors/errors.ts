import { safeStringify } from '../utils';

class UnknownThrowableError extends Error {
  private static truncate(str: string, maxLength: number): string {
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  constructor(thrown: unknown) {
    const text = safeStringify(thrown);

    try {
      super(`Unknown thrown type: ${UnknownThrowableError.truncate(text, 500)}`);
    } catch {
      super(`Unknown thrown type: Unable to stringify thrown object`);
    }
  }
}

export function caughtToError(e: unknown): Error {
  return e instanceof Error ? e : new UnknownThrowableError(e);
}
