import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  EncryptDecrypt,
  EncryptedData,
  EncryptionParams, log,
  Secret,
  SecureStore,
  SecureVersion,
} from '@paradoxical-io/common-server';
import { Brand, ErrorCode, ErrorWithCode } from '@paradoxical-io/types';
import Joi from 'joi';

export type DEK = Brand<string, 'DataEncryptionKey'>;

/**
 * Encrypted params that are encrypted by KMS
 */
type DEKParams = Omit<EncryptionParams, 'key'> & { key: DEK };

export interface Envelope {
  params: DEKParams;
  payload: EncryptedData;
}

// we don't want to pull in all of common-hapi to do this lightweight validation
// eslint-disable-next-line ban/ban
const envelopSchema = Joi.object({
  // eslint-disable-next-line ban/ban
  params: Joi.object({
    iv: Joi.string().required(),
    auth: Joi.string().required(),
    key: Joi.string().required(),
  }).required(),
  payload: Joi.string().required(),
});

/**
 * SecureStore wraps envelope encryption for blobs in s3 with KMS keys.  It encrypts every payload
 * with a unique data encryption key, and wraps that key with a master KMS key (the key encryption key)
 */
export class S3SecureStore implements SecureStore {
  private readonly crypto: EncryptDecrypt;

  private readonly s3Bucket: string;

  private readonly s3: S3Client;

  private readonly kmsKeyID: string;

  private readonly kms: KMSClient;

  constructor({
                kms = new KMSClient(),
                kmsKeyID,
                s3 = new S3Client(),
                s3Bucket,
                crypto = new EncryptDecrypt(),
              }: {
    kms?: KMSClient;
    kmsKeyID: string;
    s3?: S3Client;
    s3Bucket: string;
    crypto?: EncryptDecrypt;
  }) {
    this.kms = kms;
    this.kmsKeyID = kmsKeyID;
    this.s3 = s3;
    this.s3Bucket = s3Bucket;
    this.crypto = crypto;
  }

  async set(key: string, data: Buffer): Promise<void> {
    // encrypt the data
    const encrypted = await this.crypto.encrypt(data);

    // for the data encryption key encrypt the key using kms
    const command = new EncryptCommand({
      EncryptionContext: {
        key,
        auth: encrypted.params.auth,
      },
      KeyId: this.kmsKeyID,
      Plaintext: Buffer.from(encrypted.params.key),
    });

    const dek = await this.kms.send(command);

    if (!dek.CiphertextBlob) {
      throw new Error('Ciphertext was undefined for encrypting dek');
    }

    // create a new envelope using the newly created dek and the other non-secret params
    const envelope: Envelope = {
      params: {
        key: Buffer.from(dek.CiphertextBlob).toString('hex') as DEK,
        auth: encrypted.params.auth,
        iv: encrypted.params.iv,
      },
      payload: encrypted.data,
    };

    // write the blob to s3
    const putObjectCommand = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: JSON.stringify(envelope),
    });

    try {
      await this.s3.send(putObjectCommand);
    } catch (e) {
      log.error(`Failed to write ${this.s3Bucket}/${key}`, e);

      throw e;
    }
  }

  async exists(key: string, version?: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        VersionId: version,
      });

      await this.s3.send(command);

      return true;
    } catch (e) {
      if (e instanceof NotFound) {
        return false;
      }

      log.error(`Failed to get Head object on ${this.s3Bucket}/${key}`, e);

      throw e;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      await this.s3.send(command);
    } catch (e) {
      // DeleteObjectCommand will still be successful if it attempts to delete
      // a key that doesn't exist
      log.error(`Failed to remove object on ${this.s3Bucket}/${key}`, e);

      throw e;
    }
  }

  async get(key: string, version?: string): Promise<Buffer | undefined> {
    let data: GetObjectCommandOutput;

    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        VersionId: version,
      });

      data = await this.s3.send(command);
    } catch (e) {
      if (e instanceof NoSuchKey) {
        return undefined;
      }

      log.error(`Failed to get object ${this.s3Bucket}/${key}`, e);

      throw e;
    }

    if (!data.Body) {
      return undefined;
    }

    // validate our envelope is the shape we expect so we can't accidentally inject invalid data
    const body = await data.Body.transformToString('utf8');
    const envelope = JSON.parse(body);

    assertIsEnvelope(envelope);

    // decrypt the dek using kms
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(envelope.params.key, 'hex'),
      EncryptionContext: {
        key,
        auth: envelope.params.auth,
      },
    });

    const encryptionKeyResult = await this.kms.send(command);

    if (!encryptionKeyResult.Plaintext) {
      throw new ErrorWithCode(ErrorCode.Invalid, { errorMessage: 'DEK was unable to decrypt' });
    }

    // decrypt the payload using the stored params and the newly decrypted dek
    return this.crypto.decrypt(envelope.payload, {
      auth: envelope.params.auth,
      iv: envelope.params.iv,
      key: Buffer.from(encryptionKeyResult.Plaintext).toString() as Secret,
    });
  }

  async versions(key: string): Promise<SecureVersion[]> {
    const command = new ListObjectVersionsCommand({
      Bucket: this.s3Bucket,
      Prefix: key,
    });

    const versions = await this.s3.send(command);

    return (
      versions.Versions?.filter(v => !!v.VersionId)
        .filter(v => v.Key === key)
        .map(v => ({
          version: v.VersionId!,
          lastModified: v.LastModified,
        })) ?? []
    );
  }
}

function assertIsEnvelope(parse: unknown): asserts parse is Envelope {
  const result = envelopSchema.validate(parse);

  if (result.error) {
    throw result.error;
  }

  return result.value;
}
