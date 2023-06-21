import { ApiKey, settableTimeProvider } from '@paradox/common';
import { mock, safeExpect } from '@paradox/common-test';
import { AxiosInstance } from 'axios';

import { DDogApi } from './ddog';

beforeEach(() => {
  process.env.DD_TAGS = undefined;
  process.env.DD_API_KEY = undefined;
});

test('merges metric tags with env tags', async () => {
  const mockAxios = mock<AxiosInstance>();
  mockAxios.post.mockResolvedValue({ status: 202 });

  const timeProvider = settableTimeProvider(10000);

  const ddogApi = new DDogApi('test' as ApiKey, { service: 'paradox-test' }, mockAxios, timeProvider);

  await ddogApi.increment('test_metric', 2, { success: 'true' });

  safeExpect(mockAxios.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/series?api_key=test', {
    series: [
      {
        metric: 'paradox.test_metric',
        points: [[10, 2]],
        tags: ['service:paradox-test', 'success:true', 'env:local'],
      },
    ],
  });
});

test('parses env metric tags', async () => {
  const mockAxios = mock<AxiosInstance>();
  mockAxios.post.mockResolvedValue({ status: 202 });

  const timeProvider = settableTimeProvider(10000);

  process.env.DD_API_KEY = 'test';
  process.env.DD_TAGS = 'service:paradox-test,tagged:true';

  const ddogApi = DDogApi.default(mockAxios, timeProvider);

  await ddogApi.increment('test_metric', 2, { success: 'true' });

  safeExpect(mockAxios.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/series?api_key=test', {
    series: [
      {
        metric: 'paradox.test_metric',
        points: [[10, 2]],
        tags: ['service:paradox-test', 'tagged:true', 'success:true', 'env:local'],
      },
    ],
  });
});

test('trims and filters bad env metric tags', async () => {
  const mockAxios = mock<AxiosInstance>();
  mockAxios.post.mockResolvedValue({ status: 202 });

  const timeProvider = settableTimeProvider(10000);

  process.env.DD_API_KEY = 'test';
  process.env.DD_TAGS = ' extraspace : paradox-test  ,randomKeyAlone,,key:,tagged:true';

  const ddogApi = DDogApi.default(mockAxios, timeProvider);

  await ddogApi.increment('test_metric', 2, { success: 'true' });

  safeExpect(mockAxios.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/series?api_key=test', {
    series: [
      {
        metric: 'paradox.test_metric',
        points: [[10, 2]],
        tags: ['extraspace:paradox-test', 'tagged:true', 'success:true', 'env:local'],
      },
    ],
  });
});

test('no env metric tags', async () => {
  const mockAxios = mock<AxiosInstance>();
  mockAxios.post.mockResolvedValue({ status: 202 });

  const timeProvider = settableTimeProvider(10000);

  process.env.DD_API_KEY = 'test';

  const ddogApi = DDogApi.default(mockAxios, timeProvider);

  await ddogApi.increment('test_metric', 2, { success: 'true' });

  safeExpect(mockAxios.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/series?api_key=test', {
    series: [
      {
        metric: 'paradox.test_metric',
        points: [[10, 2]],
        tags: ['success:true', 'env:local'],
      },
    ],
  });
});
