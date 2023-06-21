import { Brand, nullOrUndefined } from '@paradoxical-io/types';

const integrationTestPrefix = 'integration_test_';
function idPrefix() {
  if (process.env.INTEGRATION_TESTS) {
    return integrationTestPrefix;
  }

  return '';
}

/**
 * Auto generates a branded string test ID
 * @param value
 */
export function newTestId<T extends string>(value?: string) {
  const suffix = value ?? newTestNumberId().toString();

  return (idPrefix() + suffix) as T;
}

/**
 * Auto generates a branded number test ID
 */
export function newTestNumberId<T extends number>(n?: number): T {
  return (n ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) as T;
}

/**
 * All new* branded test methods are prefixed with an integration identifier
 *
 * This is used so we can ignore side-effectful events in things like event consumers
 * that may have been generated from a local itest (integration test).
 */
export function isIntegrationTestId<T extends string>(id?: T): boolean {
  if (!id) {
    return false;
  }

  return !process.env.INTEGRATION_TESTS && id.startsWith(integrationTestPrefix);
}

/**
 * Often times we are mapping data from external sources and then casting to a brand type
 * such that from there on out we have the brand information. However, casting an undefined as a Brand
 * will automatically  make undefined ... a brand. That's not usually w hat you want, you want Brand | undefined
 *
 * This method will safely cast to the brand if the value is defined otherwise return undefined.
 *
 * For example:
 *
 * const name: FirstName | undefined = asBrandSafe(undefined)
 *
 * VS
 *
 * // this is compilable but _not what we intended_
 * const name: Firstname = undefined as Firstname
 *
 * @param value
 */
export function asBrandSafe<B extends Brand<K, unknown>, K>(value: K | undefined | null): B | undefined {
  if (nullOrUndefined(value)) {
    return undefined;
  }

  return value as unknown as B;
}
