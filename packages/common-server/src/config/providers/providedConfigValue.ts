import { log } from '../../logger';
import { ProvidedConfigError } from '../errors/providedConfigError';

/**
 * A configuration value to be provided by a {@link ConfigProvider}
 */
export interface ProvidedConfigValue {
  /**
   * The type of {@link ConfigProvider} to use. Maps to {@link ConfigProvider}
   */
  providerType: string;

  /**
   * The value for the {@link ConfigProvider} to use in order to resolve the configuration. Typically either a key path/name,
   * or the actual config value (for the {@link StaticConfigProvider}.
   */
  value: string;

  /**
   * Whether or not the value is sensitive.
   */
  sensitive?: boolean;
}

/**
 * A reloadable configuration value that was provided by a {@link ConfigProvider}. Used for values that can change throughout the service lifecycle.
 *
 * Ex: A rotating auth token
 */
export interface ReloadableProvidedValue {
  type: 'ReloadableProvidedValue';

  /**
   * Gets the current value synchronously
   */
  get(): string | undefined;

  /**
   * Reloads the configuration value and returns the new value. Also updates the current value.
   *
   * @param autoJitter if true should apply a short jitter to reload to minimize rate limiting
   */
  reload(autoJitter: boolean): Promise<string | undefined>;
}

/**
 * Provides a string config value.
 * @member type The provider type used to load the correct provider for a given configuration value.
 */
export interface ConfigProvider {
  type: string;
  get(providedConfig: ProvidedConfigValue): Promise<string | ReloadableProvidedValue | undefined>;

  register(value: ProvidedConfigValue): void;
}

function isProvidedConfigValue(v: unknown): v is ProvidedConfigValue {
  const config = v as ProvidedConfigValue;

  return !!(config.providerType && config.value);
}

/**
 * Given an array of [[ConfigProvider]], provides a class that can provide a configuration value by getting the correct provider,
 * and resolving the configuration value.
 */
export class ValueProvider {
  constructor(private providers: ConfigProvider[]) {}

  registerAll(config: object): void {
    Object.entries(config).forEach(([_, v]) => {
      if (typeof v === 'object' && !Array.isArray(v)) {
        if (isProvidedConfigValue(v)) {
          this.providerFor(v)?.register(v);
        } else {
          this.registerAll(v);
        }
      }
    });
  }

  /**
   * Resolves the configuration value and returns it as a string.
   * @param config The [[ProvidedConfigValue]] to resolve.
   * @throws a [[ProvidedConfigError]] if it is unable to resolve the value, either via a remote provider failure,
   * or an inability to find the correct provider by [[providerType]].
   */
  async getValue<T = string>(config: ProvidedConfigValue): Promise<T> {
    const value = await this.getValueSafe<T>(config);
    if (value === undefined) {
      log
        .with({ configProvider: config.providerType, configKey: config.value })
        .error('Failed to provide configuration value');
      throw new ProvidedConfigError(config.providerType);
    } else {
      return value;
    }
  }

  private async getValueSafe<T = string>(config: ProvidedConfigValue): Promise<T | undefined> {
    const provider = this.providerFor(config);

    if (provider !== undefined) {
      const r = await provider.get(config);

      return r as T | undefined;
    }

    return undefined;
  }

  /**
   * Finds the correct provider for the [[ProviderConfigValue]] by type, if it can.
   */
  private providerFor(config: ProvidedConfigValue): ConfigProvider | undefined {
    return this.providers.find(p => p.type === config.providerType);
  }
}
