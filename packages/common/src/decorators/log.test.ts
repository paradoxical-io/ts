/* eslint-disable @typescript-eslint/no-unused-vars */
// make sure we allow all logging (even if the test runner says otherwise)
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

test.each([new Foo(), new FooCustomLogPropertyName()])('annotations log with a custom console logger', instance => {
  const spy = jest.spyOn(process.stdout, 'write');

  instance.getFoo('yes');

  const log = spy.mock.calls[0][0].toString();
  expect(log).toContain(`start: ${instance.constructor.name}.getFoo("yes")`);
  expect(log).toContain(`method: '${instance.constructor.name}.getFoo'`);
  expect(log).toContain(`className: '${instance.constructor.name}'`);
  expect(log).toContain(`methodAction: 'start'`);

  const end = spy.mock.calls[1][0].toString();
  expect(end).toContain(`end: ${instance.constructor.name}.getFoo, succeeded=true`);
});
