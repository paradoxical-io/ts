import { SafeJson } from '@paradoxical-io/common';
/* eslint-disable @typescript-eslint/no-unused-vars */

// set forced redaction for testing purposes
process.env.FORCE_REDACTION = 'true';

// make sure we allow all logging (even if the test runner says otherwise)
process.env.PARADOX_LOG_LEVEL = 'info';

// ensure log decorators always run
process.env.PARADOX_SKIP_LOG_DECORATORS = 'false';

import { extendJest } from '@paradoxical-io/common-test';

import { Metrics } from '../metrics';
import { log, Logger } from './log';
import { logMethod, sensitive } from './logDecorator';

extendJest();

interface PartialRedaction {
  foo: string;
  bar: string;
}
class Foo {
  @logMethod()
  getFoo(a: string, @sensitive() b: string): void {}

  dontLog(a: string): void {}

  @logMethod()
  logAll(a: string, b: string): void {}

  @logMethod({ logResult: true })
  async logResponseAsync(payload: string): Promise<string> {
    return payload;
  }

  @logMethod({ logResult: true })
  logResponseSync(payload: string): string {
    return payload;
  }

  @logMethod({ logResult: true })
  logResponseUndefined(): undefined {
    return undefined;
  }

  @logMethod()
  logMultipleSensitive(@sensitive() a: string, @sensitive() b: string): void {}

  @logMethod()
  logPartialRedaction(
    @sensitive<PartialRedaction>({ keys: ['bar'] }) a: PartialRedaction,
    @sensitive() b: string
  ): void {}

  @logMethod()
  logPartialRedaction2(
    @sensitive<PartialRedaction>({ keys: ['bar', 'foo'] }) a: PartialRedaction,
    @sensitive() b: string
  ): void {}

  @logMethod()
  logPartialRedactionGeneralKeys(
    @sensitive<PartialRedaction>({ fieldNames: ['bar', 'foo'] }) a: PartialRedaction,
    @sensitive() b: string
  ): void {}

  @logMethod({ sample: { dev: 50 } })
  halfTime(): void {}

  @logMethod({ sample: { dev: 0 } })
  never(): void {}

  @logMethod()
  autoRedacts(foo: { socialSecurityNumber: string; ok: string }): void {}
}

test("console log doesn't stack overflow on hijack", () => {
  // logging calls metrics, but if metrics calls a console.log we could recursive forever
  // need to make sure we are smart to not emit metrics if metrics are writing console logs
  // eslint-disable-next-line no-console
  Metrics.instance.increment = jest.fn().mockImplementation(() => console.log('test'));

  Logger.highjackConsole();

  // eslint-disable-next-line no-console
  console.log('test');

  expect(true).toBeTruthy();
});

test('annotations log', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.getFoo('yes', 'no');

  const start = JSON.parse(spy.mock.calls[0][0].toString());
  expect(start.message).toEqual(`start: Foo.getFoo("yes", <redactable(no)>)`);
  expect(start.className).toEqual('Foo');
  expect(start.method).toEqual('Foo.getFoo');

  const end = JSON.parse(spy.mock.calls[1][0].toString());
  expect(end.message).toContain('end: Foo.getFoo, succeeded=true');
  expect(end.className).toEqual('Foo');
  expect(end.method).toEqual('Foo.getFoo');
});

test('should not log', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.dontLog('no');
  expect(spy.mock.calls.length).toEqual(0);
});

test('log with no sensitive params', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.logAll('a', 'b');

  const data = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data.message).toEqual(`start: Foo.logAll("a", "b")`);
});

test('log regardless of sensitive params', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.logMultipleSensitive('no', 'no');

  const data = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data.message).toEqual(`start: Foo.logMultipleSensitive(<redactable(no)>, <redactable(no)>)`);
});

describe('appends key value context to log mesage', () => {
  test('logs key value with in info', () => {
    const spy = jest.spyOn(process.stdout, 'write');

    log.with({ key: 'value', key2: 'value2' }).info('test');

    const data = JSON.parse(spy.mock.calls[0][0].toString());

    expect(data.message).toEqual(`test key=value, key2=value2`);
  });

  test('logs key value with in warn', () => {
    const spy = jest.spyOn(process.stdout, 'write');

    log.with({ key: 'value', key2: 'value2' }).warn('test');

    const data = JSON.parse(spy.mock.calls[0][0].toString());

    expect(data.message).toEqual(`test key=value, key2=value2`);
  });

  test('logs key value with in error', () => {
    const spy = jest.spyOn(process.stdout, 'write');

    log.with({ key: 'value', key2: 'value2' }).error('test');

    const data = JSON.parse(spy.mock.calls[0][0].toString());

    expect(data.message).toEqual(`test key=value, key2=value2`);
  });
});

describe('logs result', () => {
  test('async', async () => {
    const spy = jest.spyOn(process.stdout, 'write');
    const x = new Foo();

    const r = await x.logResponseAsync('hello');
    expect(r).toEqual('hello');

    const data = JSON.parse(spy.mock.calls[1][0].toString());
    expect(data.message).toEqual(`response: ${SafeJson.stringify('hello')}`);
    expect(data.methodAction).toEqual('result');
    expect(data.className).toEqual('Foo');
    expect(data.method).toEqual('Foo.logResponseAsync');
  });

  test('sync', () => {
    const spy = jest.spyOn(process.stdout, 'write');
    const x = new Foo();

    const r = x.logResponseSync('hello');
    expect(r).toEqual('hello');

    const data = JSON.parse(spy.mock.calls[1][0].toString());
    expect(data.message).toEqual(`response: ${SafeJson.stringify('hello')}`);
    expect(data.methodAction).toEqual('result');
    expect(data.className).toEqual('Foo');
    expect(data.method).toEqual('Foo.logResponseSync');
  });

  test('undefined', () => {
    const spy = jest.spyOn(process.stdout, 'write');
    const x = new Foo();

    const r = x.logResponseUndefined();
    expect(r).toEqual(undefined);

    const data = JSON.parse(spy.mock.calls[1][0].toString());
    expect(data.message).toEqual(`response: undefined`);
  });
});

test('log once logs once', () => {
  const spy = jest.spyOn(process.stdout, 'write');

  for (let i = 0; i < 100; i++) {
    log.once('test');
  }

  expect(spy).toHaveBeenCalledTimes(1);

  spy.mockClear();

  log.once('test2');

  expect(spy).toHaveBeenCalledTimes(1);
});

test('log partial of sensitive params', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.logPartialRedaction({ bar: 'no', foo: 'yes' }, 'no');

  const data = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data.message).toEqual(
    `start: Foo.logPartialRedaction({"bar":"<redactable(no)>","foo":"yes"}, <redactable(no)>)`
  );
});

test('log partial of multiple sensitive params using specific keys', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.logPartialRedaction2({ bar: 'no', foo: 'yes' }, 'no');

  const data = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data.message).toEqual(
    `start: Foo.logPartialRedaction2({"bar":"<redactable(no)>","foo":"<redactable(yes)>"}, <redactable(no)>)`
  );
});

test('log partial of multiple sensitive params generally', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.logPartialRedactionGeneralKeys({ bar: 'no', foo: 'yes' }, 'no');

  const data = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data.message).toEqual(
    `start: Foo.logPartialRedactionGeneralKeys({"bar":"<redactable(no)>","foo":"<redactable(yes)>"}, <redactable(no)>)`
  );
});

test('log doesnt re-use context', () => {
  const spy = jest.spyOn(process.stdout, 'write');

  log.with({ foo: 1 }).metrics('name', { latencyMS: 1 });
  log.with({ foo: 2 }).metrics('name', { latencyMS: 1 });
  const data1 = JSON.parse(spy.mock.calls[0][0].toString());
  expect(data1.foo).toEqual(1);

  const data2 = JSON.parse(spy.mock.calls[1][0].toString());
  expect(data2.foo).toEqual(2);
});

test('never logs cause is turned off', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  for (let i = 0; i < 500; i++) {
    x.never();
  }

  expect(spy).not.toHaveBeenCalled();
});

test('logs 50% of the time', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  for (let i = 0; i < 500; i++) {
    x.halfTime();
  }

  // each log decorator makes TWO calls (start and end), so half of it would be the number of instances we ran
  expect(spy.mock.calls.length).toBeWithinRange(400, 600);
});

test('always auto redacts specific known words', () => {
  const spy = jest.spyOn(process.stdout, 'write');
  const x = new Foo();

  x.autoRedacts({ socialSecurityNumber: 'wrong', ok: 'ok' });

  const data = JSON.parse(spy.mock.calls[0][0].toString());

  expect(data.message).toEqual(`start: Foo.autoRedacts({"socialSecurityNumber":"<redactable(wrong)>","ok":"ok"})`);
});
