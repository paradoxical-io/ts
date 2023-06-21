// make sure we allow all logging (even if the test runner says otherwise)
process.env.PARADOX_LOG_LEVEL = 'info';

// ensure log decorators always run
process.env.PARADOX_SKIP_LOG_DECORATORS = 'false';

import { extendJest } from '@paradoxical-io/common-test';

import { logMethod } from '../logger';
import { Metrics } from './metrics';
import { timed } from './timingDecorator';

extendJest();

class Test {
  @timed({ stat: 'test_stat_async', tags: { test: 'true' } })
  foo(): Promise<number> {
    return Promise.resolve(2);
  }

  @timed({ stat: 'test_stat_sync', tags: { test: 'true' } })
  bar(): number {
    return 2;
  }

  @logMethod({ enableMetrics: false })
  @timed({ stat: 'test_stat_async_logging', tags: { test: 'true' } })
  logAndTime(n: number): Promise<number> {
    return Promise.resolve(n);
  }

  @timed({ stat: 'test_stat_async_logging', tags: { test: 'true' } })
  @logMethod({ enableMetrics: false })
  timeAndLog(n: number): Promise<number> {
    return Promise.resolve(n);
  }

  @timed()
  @logMethod({ enableMetrics: false })
  timeNoStat(n: number): Promise<number> {
    return Promise.resolve(n);
  }
}

beforeEach(() => {
  Metrics.instance.mockBuffer = [];
});

test('timing is captured with annotation and default stat name', async () => {
  const result = await new Test().timeNoStat(1);

  expect(result).toEqual(1);

  expect(Metrics.instance.mockBuffer).toHaveLength(2);
  expect(Metrics.instance.mockBuffer?.[1].startsWith('paradox.method.timed')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[1].includes('#name:Test.timeNoStat')).toBeTruthy();

  expect(Metrics.instance.mockBuffer).logToCli();
});

test('timing is captured with annotation', () => {
  const result = new Test().bar();

  expect(result).toEqual(2);

  expect(Metrics.instance.mockBuffer).toHaveLength(1);
  expect(Metrics.instance.mockBuffer?.[0].startsWith('paradox.test_stat_sync')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0].includes('#test:true')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0].includes('name:Test.bar')).toBeTruthy();

  expect(Metrics.instance.mockBuffer).logToCli();
});

test('async timing is capture with annotation', async () => {
  const result = await new Test().foo();

  expect(result).toEqual(2);

  expect(Metrics.instance.mockBuffer).toHaveLength(1);
  expect(Metrics.instance.mockBuffer?.[0].startsWith('paradox.test_stat_async')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0].includes('#test:true')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0].includes('name:Test.foo')).toBeTruthy();
});

test('timing with annotation plays nicely with logging annotation', async () => {
  const result = await new Test().logAndTime(4);

  expect(result).toEqual(4);

  // log.info creates a metric
  expect(Metrics.instance.mockBuffer).toHaveLength(2);
  expect(Metrics.instance.mockBuffer?.[1].startsWith('paradox.test_stat_async_logging')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[1].includes('#test:true')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[1].includes('name:Test.logAndTime')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0]).toEqual('paradox.log.level:1|c|#level:info');
});

test('timing with annotation plays nicely with logging annotation reverse', async () => {
  const result = await new Test().timeAndLog(4);

  expect(result).toEqual(4);

  // log.info creates a metric
  expect(Metrics.instance.mockBuffer).toHaveLength(2);
  expect(Metrics.instance.mockBuffer?.[1].startsWith('paradox.test_stat_async_logging')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[1].includes('#test:true')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[1].includes('name:Test.timeAndLog')).toBeTruthy();
  expect(Metrics.instance.mockBuffer?.[0]).toEqual('paradox.log.level:1|c|#level:info');
});
