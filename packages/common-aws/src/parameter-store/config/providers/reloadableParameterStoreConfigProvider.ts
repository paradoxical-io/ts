import { jitter, lazy, sleep } from '@paradoxical-io/common';
import { ConfigProvider, ProvidedConfigValue, ReloadableProvidedValue } from '@paradoxical-io/common-server';
import { Milliseconds } from '@paradoxical-io/types';

import { ParameterStoreApi } from '../../api';

export class ReloadableValue implements ReloadableProvidedValue {
  type = 'ReloadableProvidedValue' as const;

  private value: string | undefined;

  private readonly reloadFn: () => Promise<string | undefined>;

  constructor(initialValue: string | undefined, reloadFn: () => Promise<string | undefined>) {
    this.value = initialValue;
    this.reloadFn = reloadFn;
  }

  get(): string | undefined {
    return this.value;
  }

  async reload(autoJitter = true): Promise<string | undefined> {
    if (autoJitter) {
      // sleep 500 ms +/- 250ms between reloads
      // this prevents a zillion things reloading all at the same time
      await sleep(jitter(500, 250) as Milliseconds);
    }

    const newValue = await this.reloadFn();

    this.value = newValue;
    return newValue;
  }
}

export class ReloadableParameterStoreConfigProvider implements ConfigProvider {
  type = 'ReloadableParameterStore';

  private readonly resolver: () => Promise<Map<string, ReloadableValue>>;

  constructor(private parameterStore: ParameterStoreApi) {
    // create a lazy promise that will pre-load all the parameters defined by the keys
    // array at the time of request. new keys can be added but it'll only lazily capture the first invocation
    // this is an optimization to prevent loading N calls to param store when we can load N/10 calls
    // as long as we pre-register all the path names
    this.resolver = lazy(async () => {
      const parameters = await this.parameterStore.getParameters([...this.keys.keys()]);

      // Preload all parameters that already exist in param store
      const mappedExisting = new Map(
        Array.from(parameters).map(([key, value]) => [
          key,
          new ReloadableValue(value, () => this.parameterStore.getParameterSafe(key, true)),
        ])
      );

      // add in any keys with undefined values (meaning they didn't exist in param store)
      // we do want the initial value for all reloadable keys if there is one
      for (const key in this.keys.keys()) {
        if (!mappedExisting.has(key)) {
          mappedExisting.set(
            key,
            new ReloadableValue(undefined, () => this.parameterStore.getParameterSafe(key, true))
          );
        }
      }

      return mappedExisting;
    });
  }

  private keys = new Map<string, ProvidedConfigValue>();

  /**
   * Register all the keys we want to load
   * @param value
   */
  register(value: ProvidedConfigValue): void {
    this.keys.set(value.value, value);
  }

  async get(providedConfig: ProvidedConfigValue): Promise<ReloadableValue | undefined> {
    // try and load all the keys at once if its not already loaded
    const all = await this.resolver();

    // if we have a key use it
    if (all.has(providedConfig.value)) {
      return all.get(providedConfig.value);
    }

    // otherwise fall back to querying one by one
    const value = await this.parameterStore.getParameterSafe(providedConfig.value, providedConfig.sensitive);

    return new ReloadableValue(value, () =>
      this.parameterStore.getParameterSafe(providedConfig.value, providedConfig.sensitive)
    );
  }
}
