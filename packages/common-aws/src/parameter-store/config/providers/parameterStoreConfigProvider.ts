import { lazy } from '@paradoxical-io/common';
import { ConfigProvider, ProvidedConfigValue } from '@paradoxical-io/common-server';

import { ParameterStoreApi } from '../../api';

export class ParameterStoreConfigProvider implements ConfigProvider {
  type = 'ParameterStore';

  private readonly resolver: () => Promise<Map<string, string>>;

  constructor(private parameterStore: ParameterStoreApi) {
    // create a lazy promise that will pre-load all the parameters defined by the keys
    // array at the time of request. new keys can be added but it'll only lazily capture the first invocation
    // this is an optimization to prevent loading N calls to param store when we can load N/10 calls
    // as long as we pre-register all the path names
    this.resolver = lazy(() => this.parameterStore.getParameters([...this.keys.keys()]));
  }

  private keys = new Map<string, ProvidedConfigValue>();

  /**
   * Register all the keys we want to load
   * @param value
   */
  register(value: ProvidedConfigValue): void {
    this.keys.set(value.value, value);
  }

  async get(providedConfig: ProvidedConfigValue): Promise<string | undefined> {
    // try and load all the keys at once if its not already loaded
    const all = await this.resolver();

    // if we have a key use it
    if (all.has(providedConfig.value)) {
      return all.get(providedConfig.value);
    }

    // otherwise fall back to querying one by one
    return this.parameterStore.getParameter(providedConfig.value, providedConfig.sensitive);
  }
}
