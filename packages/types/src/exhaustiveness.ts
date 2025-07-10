export class BottomException extends Error {}

/**
 * Fail can be used as a bottom type at the end of switch statements
 * to provide for compile time exhaustiveness checking
 *
 * https://basarat.gitbooks.io/typescript/docs/types/never.html
 *
 * @param message The bottom value
 * @param onNever If the bottom is actually executed an action response that can optionally return a default value
 */
export function bottom<T = never>(message: never, onNever?: (value: never) => T): T | never {
  if (!onNever) {
    throw new BottomException(`bottom hit: ${JSON.stringify(message)}`);
  } else {
    return onNever(message)
  }
}
