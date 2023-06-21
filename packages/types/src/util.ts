/**
 * Exclude function types
 */
export type NoFunction<T> = T extends Function ? never : T;

/**
 * Require at least one of multiple keys in an interface
 * https://stackoverflow.com/a/49725198
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequiredOrUndefined<T> = { [k in keyof Required<T>]-?: T[k] };
