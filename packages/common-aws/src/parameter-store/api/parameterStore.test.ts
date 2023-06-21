import { parameterStoreApiFactory } from '../apiFactory';

test.skip('param store', async () => {
  if (!process.env.LIVE_TESTS) {
    return;
  }

  const api = await parameterStoreApiFactory.getApi();

  const result = await api.getParameter('/open/slack/webhooks/devnotifications');

  expect(result).logToCli();
});
