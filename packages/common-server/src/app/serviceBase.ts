import { CodeGenerator } from '@paradoxical-io/common';
import chalk from 'chalk';

import { currentEnvironment, isLocal } from '../env';
import { log, Logger } from '../logger';
import { globalKeys, Metrics, monitorNodeMetrics, shutdownMetrics } from '../metrics';
import { prompt, signals } from '../process';

export function validateUTCSet() {
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      `Must run the application in UTC timezone. For local applications please add a .env and set "TZ='UTC'"`
    );
  }
}

/**
 * Wrapper around console log to avoid lint since we _do_ want to log cli here
 * @param s
 */
function cli(s: unknown) {
  // eslint-disable-next-line no-console
  console.log(s);
}

/**
 * AppBase provides default hooks for all services
 */
export abstract class ServiceBase {
  abstract name: string;

  constructor() {
    signals.enable()

    process.on('uncaughtException', (error: Error) => {
      log.error('uncaught exception. exiting', error);

      Metrics.instance.increment(globalKeys.crash);

      shutdownMetrics()
        .catch(() => {})
        .finally(() => {
          process.exit(1);
        })
        .catch(() => {});
    });

    process.on('unhandledRejection', reason => {
      if (reason instanceof Error) {
        log.error('unhandled rejection', reason);
      } else {
        cli(reason);
      }

      log.error('exiting!');

      Metrics.instance.increment(globalKeys.crash);

      shutdownMetrics()
        .catch(e => {
          // eslint-disable-next-line no-console
          console.log('Error shutting down metrics', e);
        })
        .finally(() => {
          process.exit(1);
        })
        .catch(() => {});
    });

    process.on('warning', warning => {
      log.error('node warning', warning);
    });

    signals.onShutdown(() => shutdownMetrics());

    // if for some reason someone didn't run the service using the safe wrappers below, validate again
    validateUTCSet();

    // monitor the event loop every 100ms
    monitorNodeMetrics({ frequencyMS: 1000 });

    if (isLocal && currentEnvironment() !== 'local') {
      cli(chalk.red('!!!!!!!WARNING WARNING WARNING!!!!!!\n'));
      cli(
        chalk.red(`Running against remote resources in environment '${currentEnvironment()}' on a local machine!!\n`)
      );
      cli(chalk.red("To use your local environment set PARADOX_ENV to 'local'"));
      cli(chalk.red('\nPlease be very careful!\n'));
      cli(chalk.red('!!!!!!!WARNING WARNING WARNING!!!!!!\n'));
    } else {
      log.with({ env: currentEnvironment() }).info('Booting up!');
    }

    if (!isLocal) {
      Logger.highjackConsole();
    }
  }

  async run(): Promise<void> {
    if (isLocal && currentEnvironment() === 'prod') {
      cli(chalk.yellow('Please verify the following code to run in prod.  '));

      while (true) {
        const code = new CodeGenerator().alpha(6);
        const result = await prompt(chalk.yellow(`Please repeat this code ${code}: `));
        if (result === code) {
          cli(chalk.green('Be careful....'));

          break;
        } else {
          cli(chalk.red('Try again'));
        }
      }
    }

    await this.start();
  }

  abstract start(): Promise<void>;
}

/**
 * Utility to run an app and safely emit metrics on crash
 * @param block
 */
export function safe<T>(block: () => T): void {
  try {
    validateUTCSet();

    block();
  } catch (e) {
    log.error('Unable to run app! Hard failing', e);

    Metrics.instance.increment(globalKeys.crash);

    shutdownMetrics()
      .catch(e => {
        // eslint-disable-next-line no-console
        console.log('Error shutting down metrics', e);
      })
      .finally(() => {
        process.exit(1);
      })
      .catch(() => {});
  }
}

/**
 * Utility to run an app and safely emit metrics on crash for promise based apps
 * @param app The app
 */
export async function app(app: ServiceBase): Promise<void> {
  try {
    validateUTCSet();

    log.info(`starting ${app.name}`);

    await app.run();
  } catch (e) {
    log.error('Unable to run app! Hard failing', e);

    Metrics.instance.increment(globalKeys.crash);

    await shutdownMetrics();

    process.exit(1);
  }
}
