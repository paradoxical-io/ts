import { Env } from '@paradoxical-io/types';
import convict from 'convict';
import * as fs from 'fs';
import * as path from 'path';

import { log } from '../logger';

/**
 * Load a configuration
 * @param sourceConfig Either a path to a file or an object representing the initial overrides of a config. If in doubt, set to {}
 * @param env The current environment
 * @param shape The shape for the current environment
 */
export function load<Config extends object>(
  sourceConfig: string | Partial<Config> = 'config',
  env: Env,
  shape: (env: Env) => object
): Config {
  if (env === undefined) {
    env = 'local';
  }

  const schema = convict(shape(env));

  let readConfig: Partial<Config> | undefined;

  if (typeof sourceConfig === 'string') {
    try {
      const file = path.resolve(path.join(sourceConfig, `${env}.json`));

      readConfig = JSON.parse(fs.readFileSync(file).toString());
    } catch (e) {
      // fall back to the defaults if we can't find an override file
      log.warn(`Unable to load config file specified at ${sourceConfig}, trying source object loading`);

      readConfig = {} as Partial<Config>;
    }
  } else if (typeof sourceConfig === 'object') {
    readConfig = sourceConfig as Partial<Config>;
  }

  if (readConfig === undefined) {
    throw new Error('Config must be defined. It was neither a string nor object');
  }

  const config = schema.load<Config>(readConfig as Config);
  config.validate({
    allowed: 'strict',
  });

  const loaded = config.get();

  log.with({ env }).info(`loaded config`);

  return loaded;
}
