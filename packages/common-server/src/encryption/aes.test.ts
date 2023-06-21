import { EncryptDecrypt } from './aes';

test('aes', async () => {
  const aes = new EncryptDecrypt();

  const data = 'foo'.repeat(10000);
  const result = await aes.encrypt(Buffer.from(data));

  const decrypted = await aes.decrypt(result.data, result.params);

  expect(decrypted.toString()).toEqual(data);
});
