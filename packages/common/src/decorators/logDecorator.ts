/* eslint-disable prefer-rest-params,@typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { notNullOrUndefined } from '@paradoxical-io/types';

import { preciseTimeMilli } from '../datetime';
import { SafeJson, truncate } from '../extensions';
import { chance } from '../probability';
import { PathRedaction, redact, redactKey } from '../utils';

const sensitiveMetadata = Symbol('sensitive');

interface SensitiveMetadata<T extends object = object> {
  keys: Array<{
    index: number;
    redaction: PathRedaction<T> | undefined | boolean;
  }>;
}

/**
 * Annotates an argument as sensitive so that it is not logged
 *
 * Adds the parameter index to a reflectable metadata array of indexes stored on the method
 * @param redaction Optional fields of an object to redact. If set, will ONLY redact these fields. If not set will redact the entire object
 */
export function sensitive<T extends object = object>(redaction?: PathRedaction<T>) {
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    const existingRequiredParameters: SensitiveMetadata<T> = Reflect.getOwnMetadata(
      sensitiveMetadata,
      target,
      propertyKey
    ) || { keys: [] };

    // either redact a portion of the payload or the entire thing
    existingRequiredParameters.keys.push({ index: parameterIndex, redaction: redaction ?? true });

    Reflect.defineMetadata(sensitiveMetadata, existingRequiredParameters, target, propertyKey);
  };
}

const customLogger = Symbol('paradoxical:customLogger');

/**
 * Add an annotation on a logger instance in a class to use as the logging instance for all annotation logMethods
 * allows you to capture context in a class and have that context be propagated through annotation logging.
 */
export function loggingProvider(target: Object, prop: string | symbol) {
  Reflect.defineMetadata(customLogger, prop, target);
}

export interface Logger {
  info(message: string, context?: object): void;
}

function resolveLogger(target: object): Logger | undefined {
  const loggingPropertyKey = Reflect.getMetadata(customLogger, target) ?? 'logger';

  // @ts-ignore
  const existsLoggerProperty = target[loggingPropertyKey];
  if (
    existsLoggerProperty &&
    typeof existsLoggerProperty === 'object' &&
    typeof existsLoggerProperty.info === 'function'
  ) {
    return existsLoggerProperty as Logger;
  }

  return undefined;
}

function logMethodArguments(
  logger: Logger,
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
  logger.info(`start: ${className}.${method}(${loggableArgs})`, {
    method: `${className}.${method}`,
    className,
    methodAction: 'start',
  });
}

export interface Sampler {
  percentage(): number | undefined;
}

/**
 * Automatically logs the method arguments if they are not annotated with @sensitive()
 *
 * @param enableMetrics whether or not to log timing Metrics.instance.  Metrics are _logged_ not sent to datadog
 * @param logResult whether or not to log the result.
 * @param sample Whether to only sample a percentage. Either globally or by environment. To turn logs off
 * by environment set sample value to 0. Range is 0 to 100.  Local env maps to dev.
 */
export function logMethod({
  enableMetrics = true,
  logResult = false,
  sampler,
  logger,
}: {
  enableMetrics?: boolean;
  logResult?: boolean;
  sampler?: Sampler;
  logger?: Logger;
} = {}) {
  return (
    target: object,
    method: string,
    descriptor?: TypedPropertyDescriptor<any>
  ): TypedPropertyDescriptor<any> | undefined => {
    if (process.env.PARADOX_SKIP_LOG_DECORATORS === 'true') {
      return undefined;
    }

    // save a reference to the original method this way we keep the values currently in the
    // descriptor and don't overwrite what another decorator might have done to the descriptor.
    if (descriptor === undefined) {
      descriptor = Object.getOwnPropertyDescriptor(target, method);
    }

    const originalMethod = descriptor!.value;

    let warningLogged = false;
    // editing the descriptor/value parameter
    descriptor!.value = function () {
      const sensitiveParameters: SensitiveMetadata = Reflect.getOwnMetadata(sensitiveMetadata, target, method);

      // look up the sensitive key metadata in the object and see what indexes to skip
      const indexesToSkip = new Set<number>([]);

      if (sensitiveParameters) {
        sensitiveParameters.keys.map(i => i.index).forEach(idx => indexesToSkip.add(idx));
      }

      // value == the actual argument
      // redacted false === no redaction
      // redacated is array === redact specified fields if existed, or whole object if fields list is empty
      const loggableArguments: Array<{ value: unknown; redaction: PathRedaction | undefined | boolean }> = [];
      for (let i = 0; i < arguments.length; i++) {
        if (!indexesToSkip.has(i)) {
          loggableArguments.push({ value: arguments[i], redaction: undefined });
        } else {
          loggableArguments.push({
            value: arguments[i],
            redaction: sensitiveParameters.keys.find(key => key.index === i)?.redaction,
          });
        }
      }

      const start = preciseTimeMilli();

      let canLog = true;

      const samplePercent = sampler?.percentage();

      // see if we should sample the logging
      if (notNullOrUndefined(samplePercent)) {
        canLog = chance({ percentage: samplePercent });
      }

      const resolvedLogger: Logger | undefined = canLog ? resolveLogger(this) ?? logger : undefined;

      if (!resolvedLogger) {
        // only log once
        if (!process.env.PARADOX_QUIET_TIMING_DECORATORS_EXCEPTIONS && !warningLogged) {
          // eslint-disable-next-line no-console
          console.log(`No logging instance could be resolved for timed decorator on class ${this.constructor.name}`);
          warningLogged = true;
        }

        return originalMethod.apply(this, arguments);
      }

      const className = target.constructor?.name;

      // log the method first before we start it
      logMethodArguments(resolvedLogger, method, loggableArguments, className);

      // track whether the call succeeded or not
      let callSucceeded = true;

      const timingResult = () => {
        if (enableMetrics) {
          resolvedLogger.info(`end: ${className}.${method}, succeeded=${callSucceeded}`, {
            latencyMS: preciseTimeMilli() - start,
            method: `${className}.${method}`,
            className,
            callSucceeded,
            methodAction: 'end',
          });
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logMethodResponse = (v: any) => {
        if (logResult) {
          // dont log context on the message since this context is indexed by ddog and always a defined structured search
          resolvedLogger.info(
            `response: ${truncate(v === undefined ? 'undefined' : SafeJson.stringify(v), 2500, true)}`,
            {
              method: `${className}.${method}`,
              className,
              methodAction: 'result',
            }
          );
        }
      };

      // apply the method
      const result = originalMethod.apply(this, arguments);

      // if its a promise, attach a timing listener
      if (result instanceof Promise) {
        // tslint:disable-next-line:no-floating-promises
        return result
          .then(value => {
            logMethodResponse(value);
            return value;
          })
          .catch(e => {
            callSucceeded = false;
            throw e;
          })
          .finally(timingResult);
      }

      // otherwise its sync, do the timing listener with a try
      try {
        logMethodResponse(result);

        return result;
      } catch (e) {
        callSucceeded = false;
        throw e;
      } finally {
        timingResult();
      }
    };

    // return edited descriptor as opposed to overwriting the descriptor
    return descriptor;
  };
}
