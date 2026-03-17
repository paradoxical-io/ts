import { asMilli, sleep } from '@paradoxical-io/common';
import { DDogApi, HttpDDogMetrics } from '@paradoxical-io/common-server';
import { mock, safeExpect } from '@paradoxical-io/common-test';
import { Milliseconds } from '@paradoxical-io/types';
import { Context } from 'aws-lambda';

import { Monitoring } from '../monitoring';
import { setupLambda } from './metrics';

test('flushes metrics', async () => {
  const ddog = mock<DDogApi>();

  ddog.increment.mockImplementation(async () => sleep(100 as Milliseconds));

  const metrics = new HttpDDogMetrics(ddog, asMilli(50, 'ms'));

  const closeSpy = jest.spyOn(metrics, 'close');

  const monitoring: Monitoring = {
    logger: {
      info() {},
      error() {},
      warn() {},
      debug() {},
      with() {
        return this;
      },
    },
    metrics,
  };

  const lamda = setupLambda<{}, void>(
    async () => {
      metrics.increment('test');
    },
    {
      monitoring,
      onClose: () => new Promise<void>(r => metrics.close(() => r())),
    }
  );

  // invoke the lambda
  await lamda({}, {} as Context, () => {});

  safeExpect(ddog.increment).toHaveBeenCalled();

  safeExpect(closeSpy).toHaveBeenCalled();
});
