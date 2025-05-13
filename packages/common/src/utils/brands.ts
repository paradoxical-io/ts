import { asBrandSafe as typedBrandSafe, Brand } from '@paradoxical-io/types';

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
 * @deprecated Use {@link typedBrandSafe} in the /types package instead
 * @param value
 */
export function asBrandSafe<B extends Brand<K, unknown>, K>(value: K | undefined | null): B | undefined {
  return typedBrandSafe<B, K>(value)
}
