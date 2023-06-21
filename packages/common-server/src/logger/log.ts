/* eslint-disable no-console */
import { asMilli, pruneUndefined, SafeJson } from '@paradoxical-io/common';
import { Brand, notNullOrUndefined } from '@paradoxical-io/types';
import LRUCache from 'lru-cache';
import { serializeError } from 'serialize-error';
import * as winston from 'winston';
import { LoggerOptions } from 'winston';

import { AuditUser } from '../audit';
import { isLocal } from '../env';
import { md5 } from '../hash';
import { isAxiosError } from '../http';
import { Metrics } from '../metrics';
import { getCurrentUserId, getOptionalContext, Trace, traceID } from '../trace';
import { PathRedaction, redact, redactKey } from './redaction';

export interface Cls {
  trace?: string;
  userId?: AuditUser;
  subTrace?: string;

  [k: string]: string | undefined;
}

export interface Context {
  [key: string]: string | number | boolean | undefined | null | Date;
}

interface LoggerState {
  quiet?: boolean;
}

interface Tags {
  [key: string]: string;
}

interface ClsFactory {
  currentCls(): Cls;
}

class DefaultCLsFactory implements ClsFactory {
  constructor(private traceFactory: () => Trace | undefined = traceID) {}

  currentCls(): Cls {
    const current = getCurrentUserId();

    const context = this.traceFactory();

    let testName: string | undefined;

    if (process.env.JEST_TEST) {
      try {
        testName = expect?.getState?.().currentTestName;
      } catch (e) {
        console.log('Cannot determine test name even though in jest', e);
      }
    }

    const cls = {
      // optional other context stored first, so we can never overwrite the trace
      ...(getOptionalContext() ?? {}),

      // global trace for the entire context
      trace: context?.trace,

      // specific sub trace for just this particular context
      subTrace: context?.subTrace,

      // just filter out this field so we'd rather only know if a user exists
      userId: current === 'system' ? undefined : current,

      // get the test name for logs when running under test

      testName,
    };

    return pruneUndefined(cls);
  }
}

export type AlertableLog = Brand<string, 'AlertableLog'>;

export class Logger {
  private static defaultLogLevel = process.env.PARADOX_LOG_LEVEL ? process.env.PARADOX_LOG_LEVEL : 'info';

  private static defaultOptions: LoggerOptions = {
    level: Logger.defaultLogLevel,
    format: winston.format.combine(winston.format.timestamp(), Logger.determineLogLevel()),
    transports: [
      new winston.transports.Console({ level: Logger.defaultLogLevel, debugStdout: false }),
      process.env.PARADOX_WRITE_LOG_FILE
        ? new winston.transports.File({
            filename: 'paradox.log',
            level: Logger.defaultLogLevel,
          })
        : undefined,
    ].filter(notNullOrUndefined),
  };

  private static readonly logger: winston.Logger = winston.createLogger(Logger.defaultOptions);

  private ctx: Context;

  private readonly customMetricsTags: Tags;

  private onceKeys = new LRUCache<string, undefined>({ max: 15000, maxAge: asMilli(1, 'hours') });

  constructor(
    ctx: Context = {},
    private clsFactory: ClsFactory = new DefaultCLsFactory(),
    private options: LoggerOptions = Logger.defaultOptions,
    private state: LoggerState = {},
    private logger: winston.Logger = Logger.logger,
    private emitMetrics = true,
    private emitContextOnLogMessage = process.env.PARADOX_DISABLE_CONTEXT_LOG_MESSAGE !== 'true',
    customMetricsTags: Tags = {}
  ) {
    this.ctx = ctx;
    this.customMetricsTags = customMetricsTags;
  }

  static highjackConsole() {
    const getLogger = () => {
      const stack = new Error().stack;

      if (stack && (stack.includes('console.') || stack.includes('hot-shots'))) {
        return log.skipMetrics();
      }

      return log;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (a: any, ...b: any[]) => {
      getLogger().info([a].concat(...b).join(' '));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (a: any, ...b: any[]) => {
      getLogger().error([a].concat(...b).join(' '));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.warn = (a: any, ...b: any[]) => {
      getLogger().warn([a].concat(...b).join(' '));
    };
  }

  private static determineLogLevel() {
    if (process.env.PARADOX_WINSTON_LOG_FORMAT && isLocal) {
      // Log formats defined from https://github.com/winstonjs/logform

      // @ts-ignore
      return winston.format[process.env.PARADOX_WINSTON_LOG_FORMAT]();
    }
    return winston.format.json();
  }

  /**
   * Logs a warn message that is used to trigger against datadog alerts. Changing the text of this may impact
   * alerting
   * @param msg
   */
  alarm(msg: AlertableLog) {
    this.logger.warn(this.autoAppendContext(msg), this.meta());
  }

  debug(msg: string, error?: Error | unknown) {
    if (error !== undefined) {
      this.logger.debug(this.autoAppendContext(msg), { ...this.meta(), ...this.formatErrorContext(error) });
    } else {
      this.logger.debug(this.autoAppendContext(msg), this.meta());
    }
  }

  error(msg: string, error?: Error | unknown) {
    if (this.emitMetrics) {
      Metrics.instance.increment('log.level', { ...this.customMetricsTags, level: 'error' });
    }

    const meta = this.meta();
    if (error !== undefined) {
      this.logger.error(this.autoAppendContext(msg), { ...meta, ...this.formatErrorContext(error) });
    } else {
      this.logger.error(this.autoAppendContext(msg), meta);
    }
  }

  info(msg: string) {
    if (this.emitMetrics) {
      Metrics.instance.increment('log.level', { ...this.customMetricsTags, level: 'info' });
    }

    this.logger.info(this.autoAppendContext(msg), this.meta());
  }

  /**
   * Returns true if the logger is in quiet mode (i.e. no logs)
   */
  isQuiet(): boolean {
    return !!this.state.quiet;
  }

  /**
   * Whether or not we should support redaction in any auto redacatable areas (like log decorators)
   *
   * method: The method we are logging
   * methodArgs: Array of arguments and whether they should be redacted
   */
  methodArguments(
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    methodArgs: Array<{ value: any; redaction: PathRedaction | undefined | boolean }>,
    className?: string
  ) {
    const loggableArgs = methodArgs
      .map(({ value, redaction }) => {
        if (typeof redaction === 'object') {
          // if we want to redact only specific values
          const data = redact(value, redaction);

          return SafeJson.stringify(data);
        }
        if (typeof redaction === 'boolean') {
          // we want to redact the entire thing completely
          return redactKey(value);
        }

        // auto redaction always
        return SafeJson.stringify(redact(value));
      })
      .join(', ');

    // dont log context on the message since this context is indexed by ddog and always a defined structured search
    this.with({ method: `${className}.${method}`, className, methodAction: 'start' }, false).info(
      `start: ${className}.${method}(${loggableArgs})`
    );
  }

  /**
   * Log a message with structured metrics appended. Used for high cardinality metrics
   * that shouldn't be sent to statsd
   * @param msg
   * @param latencyMS
   * @param ctx
   */
  metrics(msg: string, { latencyMS }: { latencyMS: number }, ctx?: Context) {
    // dont log context on the message since this context is indexed by ddog and always a defined structured search
    this.with({ latencyMS, ...ctx }, false).info(`${msg}, latencyMS=${latencyMS}`);
  }

  /**
   * Log a message to info once.
   * @param msg The message to log
   * @param key How to define uniquness for this message. If unset uses md5 of the message itself
   */
  once(msg: string, key?: string) {
    const uniqueKey = key ?? md5(msg);

    if (this.onceKeys.has(uniqueKey)) {
      this.debug(`[ONCE]: ${msg}`);
    } else {
      this.with({ once: true, onceKey: uniqueKey }).info(msg);

      this.onceKeys.set(uniqueKey, undefined);
    }
  }

  /**
   * Quiet silences the logger except for errors and sets the log format to a console friendly mode
   */
  quiet(format: 'simple' | 'json' = 'simple') {
    this.options = {
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        format === 'simple' ? winston.format.simple() : winston.format.json()
      ),
      transports: [new winston.transports.Console({ level: 'error', debugStdout: false, stderrLevels: ['error'] })],
    };

    this.logger = winston.createLogger(this.options);

    this.state.quiet = true;
  }

  skipMetrics(): Logger {
    return new Logger(this.ctx, this.clsFactory, this.options, this.state, this.logger, false);
  }

  trace(msg: string) {
    this.logger.silly(this.autoAppendContext(msg), this.meta());
  }

  warn(msg: string, error?: Error | unknown) {
    if (this.emitMetrics) {
      Metrics.instance.increment('log.level', { ...this.customMetricsTags, level: 'warn' });
    }

    if (error !== undefined) {
      this.logger.warn(this.autoAppendContext(msg), { ...this.meta(), ...this.formatErrorContext(error) });
    } else {
      this.logger.warn(this.autoAppendContext(msg), this.meta());
    }
  }

  // returns a new logger with the captured context
  with(obj: Context, emitContextOnLog = this.emitContextOnLogMessage): Logger {
    return new Logger(
      { ...this.ctx, ...obj },
      this.clsFactory,
      this.options,
      this.state,
      this.logger,
      this.emitMetrics,
      emitContextOnLog
    );
  }

  withTags(tags: Tags): Logger {
    return new Logger(
      this.ctx,
      this.clsFactory,
      this.options,
      this.state,
      this.logger,
      this.emitMetrics,
      this.emitContextOnLogMessage,
      {
        ...this.customMetricsTags,
        ...tags,
      }
    );
  }

  // returns a new logger with the captured context
  withTrace(trace: string): Logger {
    return new Logger(this.ctx, new DefaultCLsFactory(() => ({ trace })), this.options, this.state, this.logger);
  }

  private autoAppendContext(msg: string) {
    let context = '';

    if (this.emitContextOnLogMessage && notNullOrUndefined(this.ctx) && Object.keys(this.ctx).length > 0) {
      context = Object.keys(this.ctx)
        .reduce((message, k) => [...message, `${k}=${this.ctx[k]}`], [] as string[])
        .join(', ');
    }

    return `${msg} ${context}`.trim();
  }

  private meta(): object {
    return { ...this.ctx, ...this.addRevision(), ...this.addServiceName(), ...this.clsFactory.currentCls() };
  }

  private addRevision(): { revision?: string } {
    return {
      revision: process.env.PARADOX_REVISION,
    };
  }

  private addServiceName(): { taskName?: string } | undefined {
    if (process.env.PARADOX_LOG_TASK_NAME === 'true') {
      return {
        taskName: process.env.PARADOX_SERVICE_NAME,
      };
    }

    return undefined;
  }

  private formatErrorContext(error: Error | unknown) {
    if (isAxiosError(error)) {
      // axios errors often come with a lot of extra data. pick meaningful information out of it and only log this
      // otherwise we might end up with enormous logs that datadog/etc drop
      return {
        errMessage: error.message,
        errName: error.name,
        errStack: error.stack,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      };
    }

    const { message, name, stack, ...rest } = serializeError(error);

    // renaming the error message property to errMessage prevents a conflict with the message property
    // on the log statement.
    return {
      errMessage: message,
      errName: name,
      errStack: stack,
      ...rest,
    };
  }
}

export const log = new Logger();
