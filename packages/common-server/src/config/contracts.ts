import { Brand, Env, PropType } from '@paradoxical-io/types';

import { currentEnvironment } from '../env';
import { load } from './loader';
import { ProvidedConfigValue, ValueProvider } from './providers/providedConfigValue';

/**
 * A config that has value providers
 */
export type Providable<T> = { [k in keyof T]: unknown };

/**
 * A config that is fully hydrated (From a providable)
 */
export interface ConfigInstance {}

/**
 * Used to type config objects to work well with {@link autoResolve}
 */
export type LazyProvided<T> = { [k in keyof T]-?: PropType<T, k> | (() => Promise<PropType<T, k>>) };

/**
 * Pair a provided config (one that is used to load from ssm/etc) to its flattened instance
 *
 */
export class ShapePair<ProvidedConfig extends Providable<Config>, Config extends ConfigInstance> {
  constructor(readonly shape: (env: Env) => ConfigBlock<ProvidedConfig>) {}

  /**
   *
   * @param env
   * @param sourceConfig If a string looks for a config file in that path. If an object will use that as the base object (akin to a file)
   */
  load(env: Env = currentEnvironment(), sourceConfig: string | Partial<ProvidedConfig> = 'config') {
    const providedConfig = load<ProvidedConfig>(sourceConfig ?? {}, env, this.shape);

    return {
      using: async (loader: (conf: ProvidedConfig) => Promise<Config>): Promise<Config> => loader(providedConfig),
    };
  }
}

export type DbUserName = Brand<string, 'DbUserName'>;
export type DbPassword = Brand<string, 'DbPassword'>;
export type DbURL = Brand<string, 'DbURL'>;
export type DBPort = Brand<number, 'DBPort'>;

export interface DBConfig {
  username: DbUserName;
  password: DbPassword;
  type: 'mysql' | 'sqlite';
  url: DbURL;
  readReplicaUrl?: DbURL;
  readReplicaPort?: DBPort;
  port: DBPort;
  database: string;
  useSsl: boolean;
}

export interface ProvidedDBConfig {
  username: ProvidedConfigValue;
  password: ProvidedConfigValue;
  type: 'mysql' | 'sqlite';
  url: ProvidedConfigValue;
  readReplicaUrl?: ProvidedConfigValue;
  readReplicaPort?: ProvidedConfigValue;
  port: ProvidedConfigValue;
  database: string;
  useSsl: boolean;
}

export async function getDbConfig(config: ProvidedDBConfig, valueProvider: ValueProvider): Promise<DBConfig> {
  const [username, password, url, port, readReplicaUrl, readReplicaPort] = await Promise.all([
    valueProvider.getValue<DbUserName>(config.username),
    valueProvider.getValue<DbPassword>(config.password),
    valueProvider.getValue<DbURL>(config.url),
    valueProvider
      .getValue(config.port)
      .then(Number)
      .then(i => i as DBPort),
    config.readReplicaUrl ? valueProvider.getValue(config.readReplicaUrl).then(i => i as DbURL) : undefined,
    config.readReplicaPort
      ? valueProvider
          .getValue(config.readReplicaPort)
          .then(Number)
          .then(i => i as DBPort)
      : undefined,
  ]);

  return {
    username,
    password,
    url,
    useSsl: config.useSsl,
    type: config.type,
    readReplicaUrl,
    readReplicaPort,
    port,
    database: config.database,
  };
}

/**
 * Given allowed key type set the allowed format type for convict (either the primitive constructor
 * or the set of types allowed)
 */
type FormatOf<T extends number | string | boolean | Array<unknown>> = T extends number
  ? NumberConstructor | number[]
  : T extends string
  ? StringConstructor | string[]
  : T extends boolean
  ? BooleanConstructor | boolean[]
  : T extends Array<infer Y>
  ? ArrayConstructor | UnwrapFromBrand<Y>[]
  : T;

/**
 * Given a value of T if it extends X then return X.  We can't just unwrap a brand by doing Brand<infer X> since
 * for some reason TS thinks X is still X & { __brand: Z }.
 */
type UnwrapRawBrand<T> = T extends number ? number : T extends string ? string : T extends boolean ? boolean : T;

/**
 * Given a sub-brand<T> or a brand<T> find the actual primitive type its based on
 *
 * If the value is an array try to unwrap the array type
 */
type UnwrapFromBrand<T> = T extends Array<infer Value>
  ? Array<UnwrapFromBrand<Value>>
  : T extends Brand<infer Wrapped, unknown>
  ? UnwrapRawBrand<Wrapped>
  : T;

/**
 * A config end leaf
 */
interface ConfigLeaf<T extends number | string | boolean | Array<unknown>> {
  /**
   * The user friendly documentation of the config value
   */
  doc: string;

  /**
   * The environment variable name to override the config value with
   */
  env?: string;

  /**
   * The format type of the variable. String or Number or a set of possible values
   */
  format: FormatOf<T>;

  /**
   * A default value
   */
  default: UnwrapFromBrand<T>;
}

export type SSMFormats = 'Static' | 'ParameterStore' | 'ReloadableParameterStore';

/**
 * A remote SSM value in aws
 */
interface SSMValue {
  providerType: {
    doc: string;
    /**
     * The potential format types
     */
    format: SSMFormats[];
    default: SSMFormats;
    env?: string;
  };
  value: {
    doc: string;
    format: StringConstructor;
    default: string;
    env?: string;
    sensitive?: boolean;
  };
  sensitive?: {
    format: BooleanConstructor;
    default: true;
  };
}

/**
 * A block of config with strong typing. Recurse through the related object
 * and type key values related to the loadable type (provided config value or otherwise)
 */
export type ConfigBlock<T> =
  // if its a provided config value then we must have an ssm shape to load it
  T extends ProvidedConfigValue
    ? SSMValue
    : // otherwise if we're at a node, is it an array? then we're a leaf of array
    // if we can extend a primitive
    T extends number | string | boolean | Array<unknown>
    ? ConfigLeaf<T>
    : // or is it an object with keys and we need to recurse and try the next level
    T extends object
    ? { [k in keyof T]: ConfigBlock<T[k]> }
    : never;
