import { ProvidedConfigValue } from '@paradox/common-server';
import { mock, safeExpect } from '@paradox/common-test';

import { ParameterStoreApi } from '../../api';
import { ReloadableParameterStoreConfigProvider } from './reloadableParameterStoreConfigProvider';

test('reloads config values', async () => {
  const { provider, paramStore } = newProvider();

  const paramValue = 'testValue';
  const paramKey = 'key';

  const providedValue: ProvidedConfigValue = {
    providerType: 'ReloadableParameterStore',
    sensitive: true,
    value: paramKey,
  };

  // mock the gets to both return undefined (no value exists in parameter store)
  paramStore.getParameters.mockResolvedValue(new Map());
  paramStore.getParameterSafe.mockResolvedValue(undefined);

  provider.register(providedValue);

  const value = await provider.get(providedValue);

  safeExpect(value).toBeDefined();
  safeExpect(await value?.get()).toEqual(undefined);

  // mock get to return the param value, as if it had been added
  paramStore.getParameterSafe.mockResolvedValue(paramValue);
  safeExpect(await value?.reload()).toEqual(paramValue);
  safeExpect(await value?.get()).toEqual(paramValue);
});

function newProvider() {
  const paramStore = mock<ParameterStoreApi>();

  return {
    provider: new ReloadableParameterStoreConfigProvider(paramStore),

    paramStore,
  };
}
