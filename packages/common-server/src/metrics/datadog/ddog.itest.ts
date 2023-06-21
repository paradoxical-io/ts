import { DDogApi } from './ddog';

test('ddog metrics', async () => {
  await DDogApi.default().increment('test.ignore');
});
