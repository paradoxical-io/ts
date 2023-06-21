import { asMilli, sleep } from '@paradoxical-io/common';
import { DDogApi, HttpDDogMetrics, Metrics } from '@paradoxical-io/common-server';
import { mock, safeExpect } from '@paradoxical-io/common-test';
import { Milliseconds } from '@paradoxical-io/types';
import { Context } from 'aws-lambda';

import { setupLambda } from './metrics';

test('flushes metrics', async () => {
  const ddog = mock<DDogApi>();

  ddog.increment.mockImplementation(async () => sleep(100 as Milliseconds));

  const metrics = new HttpDDogMetrics(ddog, asMilli(50, 'ms'));

  const closeSpy = jest.spyOn(metrics, 'close');

  const lamda = setupLambda<{}, void>(async () => {
    Metrics.instance.increment('test');
  }, metrics);

  // invoke the lambda
  await lamda({}, {} as Context, () => {});

  safeExpect(ddog.increment).toHaveBeenCalled();

  safeExpect(closeSpy).toHaveBeenCalled();
});
