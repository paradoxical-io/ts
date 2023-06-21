/**
 * Returns the type of the property TProp off the object TObj as a valid type to be used
 *
 * Example:
 *
 * interface Foo {
 *     bar: string
 * }
 *
 * PropType<Foo, 'bar'> == typeof string
 */
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

/**
 * Allows for subsets of unions. For example if you have
 *
 * type MyUnionType = 'foo' | 'bar' | 'baz'
 *
 * you can do Extends<MyUnionType, 'foo' | 'bar'>
 *
 * it will fail to compile if you do
 *
 * Extends<MyUnionType, 'foo' | 'wrong'>
 */
export type Extends<T, U extends T> = U;

export interface WithType<Data, Type extends string> {
  type: Type;
  data: Data;
}

export type Intersect<T> = T extends { [K in keyof T]: infer E } ? E : T;

/**
 * Given a type T with shape: {
 *   foo: { bar: 1 }
 * }
 *
 * doing Flatten<T, 'foo'> will give you
 * {
 *   bar: 1
 * }
 *
 * This is vs Pick<T, 'foo'> which would give you
 *
 * { foo: {bar: 1 }}
 */
export type Flatten<T, k extends keyof T> = Intersect<Pick<T, k>>;
