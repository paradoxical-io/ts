import { ConfigProvider, ProvidedConfigValue } from './providedConfigValue';

export class StaticConfigProvider implements ConfigProvider {
  type = 'Static';

  register(): void {}

  async get<V extends string = string>(providedConfig: ProvidedConfigValue): Promise<V | undefined> {
    return providedConfig.value as V;
  }
}
