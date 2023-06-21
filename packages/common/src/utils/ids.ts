import { Brand, SubBrand } from '@paradoxical-io/types';

const uuid = require('uuid');

/**
 * Create a unified format of a dependent ID that needs to be deterministic.  This can be used
 * to create server side augmented events that are in response to things like transactions, etc.
 *
 * @param id The source id
 * @param reason The reason for the dependent id.  Preferably no spaces or weird characters, as this will probably be used as a DB id
 */
export function idempotentDependentID<T extends Brand<string, unknown>, Y extends SubBrand<T, unknown>>(
  id: T,
  reason: string
): Y {
  return `${id}_${reason.replace(' ', '_')}` as Y;
}

export function newNonce(): string {
  return uuid.v4();
}
