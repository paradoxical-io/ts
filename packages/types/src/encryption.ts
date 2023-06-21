import { Brand, SubBrand } from './brands';

export type PublicKey = Brand<string, 'PublicKey'>;
export type PrivateKey = Brand<string, 'PrivateKey'>;
export type PrivateKeyPassphrase = Brand<string, 'PrivateKeyPassphrase'>;

/**
 * A helper type to ensure that an encrypted value can be decrypted back to it's original Branded type,
 * and encrypted values are a SubBrand of their original branded type and 'Encrypted'
 *
 * See encryption.test.ts to see it in action
 */
export type Encrypted<T extends string> = T extends Brand<string, unknown>
  ? SubBrand<T, 'Encrypted'>
  : T extends string
  ? Brand<T, 'Encrypted'>
  : never;
