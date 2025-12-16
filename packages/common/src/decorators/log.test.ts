/* eslint-disable @typescript-eslint/no-unused-vars */
// make sure we allow all logging (even if the test runner says otherwise)
import { safeExpect } from '@paradoxical-io/common-test';

import { Logger, loggingProvider, logMethod } from './logDecorator';

process.env.PARADOX_LOG_LEVEL = 'info';

// ensure log decorators always run
process.env.PARADOX_SKIP_LOG_DECORATORS = 'false';

class Foo {
  private readonly logger: Logger = console;

  @logMethod()
  getFoo(a: string): void {}

  logs() {
    this.logger.info('uses sample');
  }
}

class FooCustomLogPropertyName {
  @loggingProvider
  private readonly loggerFancy: Logger = console;

  @logMethod()
  getFoo(a: string): void {}

  logs() {
    this.loggerFancy.info('uses sample');
  }
}

class FooCustomLogPropertyWrongTypeName {
  @loggingProvider
  // @ts-ignore
  private readonly loggerFancy = 1;

  @logMethod()
  getFoo(a: string): void {}
}

test.each([new Foo(), new FooCustomLogPropertyName()])('annotations log with a custom console logger', instance => {
  const spy = jest.spyOn(process.stdout, 'write');

  instance.getFoo('yes');

  const log = spy.mock.calls[0][0].toString();
  safeExpect(log).toContain(`start: ${instance.constructor.name}.getFoo("yes")`);
  safeExpect(log).toContain(`method: '${instance.constructor.name}.getFoo'`);
  safeExpect(log).toContain(`className: '${instance.constructor.name}'`);
  safeExpect(log).toContain(`methodAction: 'start'`);

  const end = spy.mock.calls[1][0].toString();
  safeExpect(end).toContain(`end: ${instance.constructor.name}.getFoo, succeeded=true`);
});

test('annotations do not log when the logger is of the wrong type', () => {
  const instance = new FooCustomLogPropertyWrongTypeName();
  const instance2 = new FooCustomLogPropertyWrongTypeName();
  const spy = jest.spyOn(process.stdout, 'write');

  instance.getFoo('yes');
  instance2.getFoo('yes');
  safeExpect(spy).toHaveBeenCalledTimes(1);
  safeExpect(spy.mock.calls[0][0].toString()).toContain(
    'No logging instance could be resolved for timed decorator on class FooCustomLogPropertyWrongTypeName'
  );
});
