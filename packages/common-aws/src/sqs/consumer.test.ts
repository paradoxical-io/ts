import { asSeconds } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';
import { Seconds } from '@paradoxical-io/types';

import { determineRetryDelay, RepublishMessage } from './consumer';

test('no exponential uses retryDecorator value', () => {
  safeExpect(determineRetryDelay({ retryInSeconds: 5 as Seconds } as RepublishMessage, 5)).toEqual(5 as Seconds);
});

describe('exponential', () => {
  test('sets min', () => {
    safeExpect(
      determineRetryDelay(
        {
          retryInSeconds: {
            type: 'exponential-backoff',
            min: asSeconds(1, 'seconds'),
            max: asSeconds(100, 'seconds'),
          },
        } as RepublishMessage,
        0
      )
    ).toEqual(asSeconds(1, 'seconds'));
  });

  test('sets max', () => {
    safeExpect(
      determineRetryDelay(
        {
          retryInSeconds: {
            type: 'exponential-backoff',
            min: asSeconds(1, 'seconds'),
            max: asSeconds(100, 'seconds'),
          },
        } as RepublishMessage,
        100
      )
    ).toEqual(asSeconds(100, 'seconds'));
  });

  test.each([
    [0, asSeconds(1 + 0, 'seconds')],
    [1, asSeconds(1 + 2, 'seconds')],
    [2, asSeconds(1 + 4, 'seconds')],
    [3, asSeconds(1 + 8, 'seconds')],
    [4, asSeconds(1 + 16, 'seconds')],
  ])('exponentially applies tries for count %j to be %j seconds', (count, waitTime) => {
    safeExpect(
      determineRetryDelay(
        {
          retryInSeconds: {
            type: 'exponential-backoff',
            min: asSeconds(1, 'seconds'),
            max: asSeconds(100, 'seconds'),
          },
        } as RepublishMessage,
        count
      )
    ).toEqual(waitTime);
  });
});
