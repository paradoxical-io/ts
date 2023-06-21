export function nullOrUndefined<T, Y extends NonNullable<T>>(v: Y | null | undefined): v is null | undefined {
  return v === null || v === undefined;
}

export function notNullOrUndefined<T>(v: T | null | undefined): v is NonNullable<T> {
  return !nullOrUndefined(v);
}

export function nullishToUndefined<T>(v: T | null | undefined): T | undefined {
  if (nullOrUndefined(v)) {
    return undefined;
  }

  return v;
}

/**
 * Specifies that all keys of T are non nullable
 */
export type NonNullableAll<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};
