// src/tests/reporter.ts

// Those two packages supply the types we need to
// build our custom reporter
import { Reporter, Test } from '@jest/reporters';

// Our reporter implements only the onRunComplete lifecycle
// function, run after all tests have completed
export default class JestReporter implements Pick<Reporter, 'onTestStart'> {
  onTestStart(test: Test): Promise<void> | void {
    // eslint-disable-next-line no-console
    console.log(`START: ${test.path.replace(test.context.config.cwd, '')}`);
  }
}
