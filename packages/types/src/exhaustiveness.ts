/**
 * Fail can be used as a bottom type at the end of switch statements
 * to provide for compile time exhaustiveness checking
 *
 * https://basarat.gitbooks.io/typescript/docs/types/never.html
 *
 * @param message The bottom value
 * @param defaultValue if a default value is provided will return this at runtime. This allows
 * bottom to NOT fail at runtime. If no default is supplied, bottom will throw
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bottom<T = any>(message: never, defaultValue?: { data: T; log?: (msg: string) => void }): never {
  if (!defaultValue) {
    throw new Error(`bottom hit: ${JSON.stringify(message)}`);
  } else {
    defaultValue.log?.(`bottom hit: ${JSON.stringify(message)}`);

    // @ts-ignore
    return defaultValue.data;
  }
}
