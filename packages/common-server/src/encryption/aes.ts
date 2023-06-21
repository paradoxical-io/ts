import { Brand } from '@paradoxical-io/types';
import { CipherGCM, createCipheriv, createDecipheriv, DecipherGCM, randomBytes } from 'crypto';
import * as util from 'util';

export type EncryptedData = Brand<string, 'Encrypted'>;

export type Secret = Brand<string, 'Secret'>;

export interface EncryptionParams {
  iv: string;
  key: Secret;
  auth: string;
}

export interface Encrypted {
  params: EncryptionParams;
  data: EncryptedData;
}

/**
 * Wrapper around aes 256 GCM. GCM is better than CBC because its parallelizable by block, and provides authentication
 * (similar to an HMAC) of the data. This lets the encryption fail if someone has tampered with the data
 */
export class EncryptDecrypt {
  private static readonly ivSize = 16;

  // key size is proportional to the algo, don't change this without changing the algo
  private static readonly keySize = 32;

  private static readonly algorithm = `aes-256-gcm`;

  private static readonly encodingIn = 'utf8';

  private static readonly encodingOut = 'hex';

  async encrypt(data: Buffer): Promise<Encrypted> {
    const iv = await util.promisify(randomBytes)(EncryptDecrypt.ivSize);
    const key = await util.promisify(randomBytes)(EncryptDecrypt.keySize);

    const cipher = createCipheriv(EncryptDecrypt.algorithm, key, iv) as CipherGCM;

    return new Promise(r => {
      let encrypted = '';
      cipher.on('readable', () => {
        let chunk;
        // eslint-disable-next-line no-cond-assign
        while ((chunk = cipher.read()) !== null) {
          encrypted += chunk.toString(EncryptDecrypt.encodingOut);
        }
      });
      cipher.on('end', () => {
        r({
          params: {
            iv: iv.toString(EncryptDecrypt.encodingOut),
            key: key.toString(EncryptDecrypt.encodingOut) as Secret,
            auth: cipher.getAuthTag().toString(EncryptDecrypt.encodingOut),
          },
          data: encrypted as EncryptedData,
        });
      });

      cipher.write(data, EncryptDecrypt.encodingIn);
      cipher.end();
    });
  }

  async decrypt(data: EncryptedData, params: EncryptionParams): Promise<Buffer> {
    const decipher = createDecipheriv(
      EncryptDecrypt.algorithm,
      Buffer.from(params.key, EncryptDecrypt.encodingOut),
      Buffer.from(params.iv, EncryptDecrypt.encodingOut)
    ) as DecipherGCM;

    decipher.setAuthTag(Buffer.from(params.auth, EncryptDecrypt.encodingOut));

    return new Promise(r => {
      let decrypted = '';
      decipher.on('readable', () => {
        let chunk;
        // eslint-disable-next-line no-cond-assign
        while ((chunk = decipher.read()) !== null) {
          decrypted += chunk.toString(EncryptDecrypt.encodingIn);
        }
      });
      decipher.on('end', () => {
        r(Buffer.from(decrypted, EncryptDecrypt.encodingIn));
      });

      decipher.write(data, EncryptDecrypt.encodingOut);
      decipher.end();
    });
  }
}
