import { asSeconds, settableTimeProvider, timeAdder } from '@paradox/common';
import { safeExpect } from '@paradox/common-test/dist/jest';
import { Seconds } from '@paradox/types';

import { getInvisibilityDelay } from './publisher';

test('viz timeout calculates seconds', () => {
  safeExpect(getInvisibilityDelay(undefined)).toEqual(0 as Seconds);

  safeExpect(
    getInvisibilityDelay({
      delay: {
        type: 'invisible',
        seconds: 1 as Seconds,
      },
    })
  ).toEqual(1 as Seconds);
});

test('viz timeout calculates deferred by max time', () => {
  const time = settableTimeProvider();

  const landingTime = time.addDays(3);

  time.reset();

  // beacuse the time is beyond the max, the viz timeout should be the max
  safeExpect(
    getInvisibilityDelay(
      {
        delay: {
          type: 'processAfter',
          epoch: landingTime,
        },
      },
      time
    )
  ).toEqual(asSeconds(15, 'minutes'));

  time.addDays(2);
  time.addHours(23);
  time.addMinutes(50);

  // we landed with 10 min left to when we want to process, so it should be invisible for 10 min
  safeExpect(
    getInvisibilityDelay(
      {
        delay: {
          type: 'processAfter',
          epoch: landingTime,
        },
      },
      time
    )
  ).toEqual(asSeconds(10, 'minutes'));
});

test('process after in the past sends a message now', () => {
  const time = settableTimeProvider();

  // asking to process in the past should be the same as publishing a message with no viz timeout
  safeExpect(
    getInvisibilityDelay(
      {
        delay: {
          type: 'processAfter',
          epoch: timeAdder(time.epochMS()).addDays(-1),
        },
      },
      time
    )
  ).toEqual(asSeconds(0, 'seconds'));
});
