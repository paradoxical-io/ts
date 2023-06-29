import { Encryption } from '@paradoxical-io/common-server';
import { safeExpect } from '@paradoxical-io/common-test';
import { PublicKey } from '@paradoxical-io/types';
import Joi from 'joi';

import { JoiExtensions, withEncryption } from './validation';

test('withEncryption encrypts', () => {
  Encryption.encryptWithPublicKey = jest.fn().mockReturnValue('encrypted');

  safeExpect(Joi.attempt('test', withEncryption('testKey' as PublicKey))).toEqual('encrypted');
  safeExpect(Encryption.encryptWithPublicKey).toHaveBeenCalledWith('test', 'testKey' as PublicKey);
});

test('optional strings', () => {
  safeExpect(() => Joi.assert('', JoiExtensions.optionalString())).not.toThrow();
  safeExpect(() => Joi.assert(' ', JoiExtensions.optionalString())).not.toThrow();
  safeExpect(() => Joi.assert('abc', JoiExtensions.optionalString())).not.toThrow();
  safeExpect(() => Joi.assert(undefined, JoiExtensions.optionalString())).not.toThrow();

  safeExpect(() => Joi.assert(null, JoiExtensions.optionalString())).toThrow();
  safeExpect(() => Joi.assert(null, JoiExtensions.optionalString({ allowNull: true }))).not.toThrow();
  safeExpect(() => Joi.assert(1, JoiExtensions.optionalString())).toThrow();
  safeExpect(() => Joi.assert({}, JoiExtensions.optionalString())).toThrow();

  safeExpect(Joi.attempt('', JoiExtensions.optionalString())).toEqual(undefined);
  safeExpect(Joi.attempt('  ', JoiExtensions.optionalString())).toEqual(undefined);
});
