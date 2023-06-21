/**
 * Create compile time tagged types aka haskell style newtypes
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * Create sub brands from brands. For example, a FirstName is a type of Name
 */
export type SubBrand<T, Y> = T extends Brand<unknown, unknown> ? T & { __subBrand: Y } : never;
