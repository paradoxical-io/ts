import { CommonRouteProperties } from '@hapi/hapi';
import { Encryption } from '@paradoxical-io/common-server';
import { PublicKey } from '@paradoxical-io/types';
import Joi, { Schema, StringSchema } from 'joi';

import { HAPIWithEnvelope } from './types';

export function validatedObject<T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: { [k in keyof T]-?: any }
): Joi.ObjectSchema<T> {
  // eslint-disable-next-line ban/ban
  return Joi.object<T, true>(schema);
}

export class JoiExtensions {
  static optionalString({ allowNull } = { allowNull: false }): StringSchema<string | undefined> {
    const match = Joi.string().trim().empty('');

    if (allowNull) {
      return match.allow(null);
    }

    return match;
  }

  static numericIdentifier() {
    return Joi.number().positive();
  }
}

/**
 * Extending Joi with a simple string "validator" that takes advantage of the validate function to encrypt the string
 */
const joiWithEncryption = Joi.extend(joi => ({
  type: 'encrypted',
  base: joi.string(),
  rules: {
    publicKey: {
      method(key) {
        return this.$_addRule({ name: 'publicKey', args: { key } });
      },
      args: [
        {
          name: 'key',
          ref: true,
          assert: value => typeof value === 'string',
          message: 'must be a string',
        },
      ],
      validate(value, helpers, args) {
        return Encryption.encryptWithPublicKey(value, args.key);
      },
    },
  },
}));

/**
 * Encrypts the string value that is returned from Joi. This function mostly exist to wrap the untyped Joi extension method
 * @param publicKey The key to use for encryption
 */
export function withEncryption(publicKey: PublicKey): Joi.StringSchema {
  return joiWithEncryption.encrypted().publicKey(publicKey);
}

/**
 * A route splat payload that does not enforce validation
 */
export interface UnValidatedRoute<Resp> extends Pick<HAPIWithEnvelope<{}, Resp>, 'handler' | 'options'> {
  options: Omit<CommonRouteProperties, 'validate'>;
}

/**
 * Requires a type of T has all its values validated by a Joi.Schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validation<T> = { [k in keyof T]-?: Schema<T[k]> | Joi.ObjectSchema<T[k]> };
