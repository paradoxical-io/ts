import { Encrypted, PrivateKey, PrivateKeyPassphrase, PublicKey } from '@paradoxical-io/types';
import { constants, privateDecrypt, publicEncrypt } from 'crypto';

export class Encryption {
  static encryptWithPublicKey<T extends string>(value: T, publicKey: PublicKey): Encrypted<T> {
    const buffer = Buffer.from(value, 'utf8');
    const encrypted = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, buffer);

    return encrypted.toString('base64') as Encrypted<T>;
  }

  static decryptWithPrivateKey<T extends string>(
    value: Encrypted<T>,
    privateKey: PrivateKey,
    passphrase: PrivateKeyPassphrase
  ): T {
    const buffer = Buffer.from(value, 'base64');
    const decrypted = privateDecrypt({ key: privateKey, passphrase, padding: constants.RSA_PKCS1_PADDING }, buffer);

    return decrypted.toString('utf8') as T;
  }
}
