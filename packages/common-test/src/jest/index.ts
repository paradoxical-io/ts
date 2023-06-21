// https://github.com/facebook/jest/issues/7832#issuecomment-462343138

import { DeepPartial } from 'ts-essentials';

export * from './jestExtensions';
export * from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericFunction = (...args: any[]) => any;

type PickByTypeKeyFilter<T, C> = { [K in keyof T]: T[K] extends C ? K : never };

type KeysByType<T, C> = PickByTypeKeyFilter<T, C>[keyof T];

type ValuesByType<T, C> = { [K in keyof T]: T[K] extends C ? T[K] : never };

type PickByType<T, C> = Pick<ValuesByType<T, C>, KeysByType<T, C>>;

export type MethodsOf<T> = KeysByType<Required<T>, GenericFunction>;

type InterfaceOf<T> = PickByType<T, GenericFunction>;

type PartiallyMockedInterfaceOf<T> = { [K in MethodsOf<T>]?: jest.Mock<InterfaceOf<T>[K]> };

/**
 * A smart mock for jest that automatically mocks all methods
 */
export function mock<T>(): jest.Mocked<T> {
  return autoMockProxy<T>();
}

/**
 * Automatically create a jest mock for all methods. If a default is provided, resolve the value for every method of T unless otherwise specified
 * @param defaultResponse
 */
export function autoMockProxy<T>(defaultResponse?: unknown): jest.Mocked<T> {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = {} as any;

  // @ts-ignore
  return new Proxy<T>(obj, {
    get(target, propKey: keyof T) {
      if (obj[propKey]) {
        return obj[propKey];
      }

      // seems that somehow a .then is being applied to async proxies so ignore that otherwise we create a
      // a proxy of a promise we didnt mean to make
      if (propKey === 'then') {
        return;
      }

      if (defaultResponse) {
        // @ts-ignore
        obj[propKey] = jest.fn().mockReset().mockResolvedValue(defaultResponse);
      } else {
        // @ts-ignore
        obj[propKey] = jest.fn().mockReset();
      }

      return obj[propKey];
    },
  });
}

export function mockMethod<T>(root: T, mockedMethod: MethodsOf<T>, resetIfExists = true): jest.Mocked<T> {
  const partiallyMocked: PartiallyMockedInterfaceOf<T> = root as PartiallyMockedInterfaceOf<T>;

  // set the mock method if its not already set as a mock
  if ((partiallyMocked[mockedMethod] as unknown as jest.Mock)?.mock === undefined) {
    // eslint-disable-next-line no-return-assign
    partiallyMocked[mockedMethod] = jest.fn().mockReset();
  } else if (resetIfExists) {
    partiallyMocked[mockedMethod]?.mockReset();
  }

  return partiallyMocked as jest.Mocked<T>;
}

export function asMocked<T>(item: T): jest.Mocked<T> {
  return item as jest.Mocked<T>;
}

/**
 * Maps a type to its call arguments if the type is a function or a jest function spy, otherwise never
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FunctionParams<T> = T extends (...args: any) => any
  ? Parameters<T> // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : T extends jest.SpyInstance<any, infer Y>
  ? Y
  : never;

type ArrayElement<T> = T extends Array<infer Y> ? Y : never;

/**
 * Maps a type to its unpacked form if it's an array, otherwise maps the type to itself
 */
type SafeUnpackedPotentialArray<T> = T extends Array<infer Y> ? Y : T;

/**
 * Wrap the source in a generic safe form for jest expect. This ensures that matchers
 * all properly type check against the input type
 * @param item
 */
export function safeExpect<T>(item: T) {
  return new SafeExpector(item);
}

/**
 * A method that can help type object containing matchers when using this against
 * hasCalled function parameters
 * @param contains
 */
export function safeObjectContaining<T, Y extends T>(contains: Partial<Y>): T {
  return expect.objectContaining(contains);
}

/**
 * Safely cast a deep partial item as the actual item. This is useful in tests
 * when you can get away without constructing the full object but want to avoid an explicit
 * "as" cast which will invalidate any compile time checking.
 * @param p
 */
export function safePartial<T>(p: DeepPartial<T>): T {
  return p as T;
}

/**
 * Allows you to do a deep partial match for expectations
 * @param contains
 */
export function deepSafeObjectContaining<T, Y extends T>(contains: DeepPartial<Y>): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const process = (data: any) => {
    // @ts-ignore
    const t: T = {};

    Object.keys(data).forEach(k => {
      // @ts-ignore
      const value = data[k];

      // @ts-ignore
      t[k] = Array.isArray(value) || typeof value === 'object' ? safeObjectContaining(process(value)) : value;
    });

    return t;
  };

  return safeObjectContaining(process(contains));
}

class SafeExpector<T> {
  private negate: boolean;

  constructor(private source: T) {
    this.negate = false;
  }

  get not(): SafeExpector<T> {
    this.negate = !this.negate;
    return this;
  }

  get rejects() {
    return expect(this.source).rejects;
  }

  /**
   * We don't want to encourage `.resolves` behavior because it doesn't buy us anything.
   * We might as well just `await thing` rather than `await safeExpect(thing).resolves` because the test
   * will fail in either case and `await thing` not throwing means a pass anyway in this case.
   */
  get resolves() {
    return expect(this.source).resolves;
  }

  /**
   * It can be useful to want to conditionally negate an expectation. This allows us to chain
   * a programmatic expectation negation:
   *
   * i.e.
   *
   * expect(foo).not.toBeTruthy() === expect(foo).negated(true).toBeTruthy()
   *
   * and
   *
   * expect(foo).toBeTruthy() === expect(foo).negated(false).toBeTruthy()
   *
   * @param negate Whether or not to negate the previous part of the expectation chain
   */
  negated(negate: boolean) {
    if (negate) {
      return this.not;
    }
    return this;
  }

  toBeDefined() {
    this.expect().toBeDefined();
  }

  toBeFalsy() {
    this.expect().toBeFalsy();
  }

  toBeGreaterThan(t: number) {
    this.expect().toBeGreaterThan(t);
  }

  toBeGreaterThanOrEqual(t: number) {
    this.expect().toBeGreaterThanOrEqual(t);
  }

  toBeLessThan(t: number) {
    this.expect().toBeLessThan(t);
  }

  toBeLessThanOrEqual(t: number) {
    this.expect().toBeLessThanOrEqual(t);
  }

  toBeTruthy() {
    this.expect().toBeTruthy();
  }

  toBeUndefined() {
    this.expect().toBeUndefined();
  }

  toBeNull() {
    this.expect().toBeNull();
  }

  toBeWithinRange(floor: number, ceil: number) {
    this.expect().toBeWithinRange(floor, ceil);
  }

  toContain(t: SafeUnpackedPotentialArray<T>) {
    this.expect().toContain(t);
  }

  toContainEqual(elem: ArrayElement<T>) {
    this.expect().toContainEqual(elem);
  }

  toEqual(t: T) {
    this.expect().toEqual(t);
  }

  toHaveBeenCalled() {
    this.expect().toHaveBeenCalled();
  }

  toHaveBeenCalledTimes(times: number) {
    this.expect().toHaveBeenCalledTimes(times);
  }

  toHaveBeenCalledWith(...args: FunctionParams<T>) {
    this.expect().toHaveBeenCalledWith(...args);
  }

  toHaveBeenNthCalledWith(n: number, ...args: FunctionParams<T>) {
    this.expect().toHaveBeenNthCalledWith(n, ...args);
  }

  toHaveLength(n: number) {
    this.expect().toHaveLength(n);
  }

  toMatchObject(t: Partial<T>) {
    this.expect().toMatchObject(t);
  }

  /**
   * Extension to jest comparisons that asserts the shape matches but excludes the typed fields
   * @param t
   * @param fields
   */
  toMatchObjectExcluding(t: Partial<T>, fields: Array<keyof NonNullable<T>>) {
    // create copies so we can delete the fields
    const toCompare = { ...t };

    const original = { ...this.source };

    fields.forEach(f => {
      delete toCompare[f as keyof T];
      delete original[f as keyof T];
    });

    this.expect(original).toMatchObject(toCompare);
  }

  toThrow(error?: string | ErrorConstructor | RegExp | Error) {
    this.expect().toThrow(error);
  }

  toMatchSnapshot() {
    this.expect().toMatchSnapshot();
  }

  private expect(s?: T) {
    const original = s ?? this.source;
    if (this.negate) {
      return expect(original).not;
    }

    return expect(original);
  }
}
