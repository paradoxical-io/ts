import { Brand, Encrypted, PrivateKey, PrivateKeyPassphrase, PublicKey } from '@paradoxical-io/types';
import { generateKeyPairSync } from 'crypto';

import { Encryption } from './encryption';

const generateKeyPair = (passphrase: PrivateKeyPassphrase): { publicKey: PublicKey; privateKey: PrivateKey } => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
  });

  return {
    publicKey: publicKey as PublicKey,
    privateKey: privateKey as PrivateKey,
  };
};

type TestBrand = Brand<string, 'TestBrand'>;

// including these two functions to ensure the back and forth type-checking actually works
const enc = (_: Encrypted<TestBrand>) => 'encrypted';
const dec = (_: TestBrand) => 'decrypted';

test('encryption and decryption', () => {
  const toEncrypt = 'test value' as TestBrand;
  const pass = 'test1234' as PrivateKeyPassphrase;
  const { publicKey, privateKey } = generateKeyPair(pass);

  const encrypted = Encryption.encryptWithPublicKey(toEncrypt, publicKey);

  // encrypted should be an Encrypted<TestBrand>, so this compiles
  enc(encrypted);

  expect(encrypted).not.toEqual(toEncrypt);

  const decrypted = Encryption.decryptWithPrivateKey(encrypted, privateKey, pass);

  // decrypted should be a TestBrand, so this compiles
  dec(decrypted);

  expect(Encryption.decryptWithPrivateKey(encrypted, privateKey, pass)).toEqual(toEncrypt);
});
