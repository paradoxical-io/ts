import { safeStringify } from '@paradox/common';
import { nullOrUndefined } from '@paradox/types';

import { currentEnvironment } from '../env';

export interface PathRedaction<T = object> {
  /**
   * Specific top level keys
   */
  keys?: Array<keyof T>;

  /**
   * Specific global field names. Any field of any object regardless of how deep that matches this will be redacted
   */
  fieldNames?: string[];
}

/**
 * These fields are always redacted no matter what. It's a shotgun approach of catching common failure modes
 */
const AUTO_REDACT_FIELD_NAMES = [
  'password',
  'ssn',
  'photos',
  'cardNumber',
  'pin',
  'pan',
  'pinNumber',
  'socialSecurityNumber',
  'taxId',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function redactKey(data: any): string {
  if (currentEnvironment() === 'prod') {
    return '<redacted>';
  }

  if (typeof data === 'object') {
    return `<redactable(${safeStringify(data)})>`;
  }

  return `<redactable(${data?.toString()})>`;
}

function shouldRedact<T extends object>(key: string, redaction: PathRedaction<T>): boolean {
  // always, under all circumstances, redact passwords, ssn, and photos
  const allRedactionFieldNames = new Set(
    [...(redaction.keys ?? []), ...(redaction.fieldNames ?? []), ...AUTO_REDACT_FIELD_NAMES].map(i =>
      i.toString().toLowerCase().replace('_', '')
    )
  );

  // see if the normalized set of keys (all lowercase, not snake case) matches
  // the normalized key (also all lowercase, not snake case)
  return allRedactionFieldNames.has(key.toLowerCase().replace('_', ''));
}

/**
 * Redacts the keys in the object and returns a copy of the redacted object
 * @param k
 * @param options
 */
// tslint:disable:no-any
export function redact<T extends object = object>(
  k: T,
  options: PathRedaction<T> = { fieldNames: AUTO_REDACT_FIELD_NAMES }
): T {
  if (nullOrUndefined(k)) {
    return k;
  }

  if (typeof k === 'object') {
    return Object.keys(k).reduce((acc, key) => {
      if (shouldRedact(key, options)) {
        // @ts-ignore
        acc[key] = redactKey(redact(k[key]));
      } else {
        // @ts-ignore
        acc[key] = redact(k[key], { fieldNames: options.fieldNames });
      }
      return acc;
    }, {} as { [k: string]: unknown }) as unknown as T;
  }

  return k;
}
