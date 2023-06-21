import { awsRethrow } from './errors';

test('errors', async () => {
  const p = new Promise((resolve, reject) => reject(new Error('foo'))).catch(awsRethrow());

  await expect(p).rejects.toThrowError(new Error('foo\n{}\n'));
});
