import {
  EncryptDecrypt,
  EncryptedData,
  EncryptionParams,
  Secret,
  SecureStore,
  SecureVersion,
} from '@paradox/common-server';
import { Brand, ErrorCode, ErrorWithCode } from '@paradox/types';
import AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import Joi from 'joi';

import { awsRethrow } from '../errors';

export type DEK = Brand<string, 'DataEncryptionKey'>;

/**
 * Encrypted params that are encrypted by KMS
 */
type DEKParams = Omit<EncryptionParams, 'key'> & { key: DEK };

export interface Envelope {
  params: DEKParams;
  payload: EncryptedData;
}

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
  private crypto: EncryptDecrypt;

  private s3Bucket: string;

  private s3: AWS.S3;

  private kmsKeyID: string;

  private kms: AWS.KMS;

  constructor({
    kms = new AWS.KMS(),
    kmsKeyID,
    s3 = new AWS.S3(),
    s3Bucket,
    crypto = new EncryptDecrypt(),
  }: {
    kms?: AWS.KMS;
    kmsKeyID: string;
    s3?: AWS.S3;
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
    const dek = await this.kms
      .encrypt({
        EncryptionContext: {
          key,
          auth: encrypted.params.auth,
        },
        KeyId: this.kmsKeyID,
        Plaintext: encrypted.params.key,
      })
      .promise()
      .catch(awsRethrow());

    if (!dek.CiphertextBlob) {
      throw new Error('Ciphertext was undefined for encrypting dek');
    }

    // create a new envelope using the newly created dek and the other non-secret params
    const envelope: Envelope = {
      params: {
        key: dek.CiphertextBlob.toString('hex') as DEK,
        auth: encrypted.params.auth,
        iv: encrypted.params.iv,
      },
      payload: encrypted.data,
    };

    // write the blob to s3
    await this.s3
      .putObject({
        Bucket: this.s3Bucket,
        Key: key,
        Body: JSON.stringify(envelope),
      })
      .promise()
      .catch(awsRethrow(`Writing ${this.s3Bucket}/${key}`));
  }

  async exists(key: string, version?: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.s3Bucket,
          Key: key,
          VersionId: version,
        })
        .promise()
        .catch(awsRethrow(`Head object on ${this.s3Bucket}/${key}`));

      return true;
    } catch (e) {
      if (e instanceof Error && (e as AWS.AWSError).statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.s3Bucket,
          Key: key,
        })
        .promise()
        .catch(awsRethrow(`Remove object on ${this.s3Bucket}/${key}`));
    } catch (e) {
      if (e instanceof Error && (e as AWS.AWSError).statusCode === 404) {
        return;
      }
      throw e;
    }
  }

  async get(key: string, version?: string): Promise<Buffer | undefined> {
    let data: PromiseResult<AWS.S3.GetObjectOutput, AWS.AWSError>;
    try {
      data = await this.s3
        .getObject({
          Bucket: this.s3Bucket,
          Key: key,
          VersionId: version,
        })
        .promise()
        .catch(awsRethrow(`Get object on ${this.s3Bucket}/${key}`));
    } catch (e) {
      if (e instanceof Error && (e as AWS.AWSError).statusCode === 404) {
        return undefined;
      }
      throw e;
    }

    if (!data.Body) {
      return undefined;
    }

    // validate our envelope is the shape we expect so we can't accidentally inject invalid data
    const envelope = JSON.parse(data.Body.toString('utf8'));

    assertIsEnvelope(envelope);

    // decrypt the dek using kms
    const encryptionKeyResult = await this.kms
      .decrypt({
        CiphertextBlob: Buffer.from(envelope.params.key, 'hex'),
        EncryptionContext: {
          key,
          auth: envelope.params.auth,
        },
      })
      .promise()
      .catch(awsRethrow());

    if (!encryptionKeyResult.Plaintext) {
      throw new ErrorWithCode(ErrorCode.Invalid, { errorMessage: 'DEK was unable to decrypt' });
    }

    // decrypt the payload using the stored params and the newly decrypted dek
    return this.crypto.decrypt(envelope.payload, {
      auth: envelope.params.auth,
      iv: envelope.params.iv,
      key: encryptionKeyResult.Plaintext.toString() as Secret,
    });
  }

  async versions(key: string): Promise<SecureVersion[]> {
    const versions = await this.s3
      .listObjectVersions({
        Bucket: this.s3Bucket,
        Prefix: key,
      })
      .promise()
      .catch(awsRethrow());

    return (
      versions.Versions?.filter(v => !!v.VersionId).map(v => ({
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
