import { StaticConfigProvider, ValueProvider } from '@paradox/common-server';
import { ConfigurationOptions } from 'aws-sdk';
import SSM from 'aws-sdk/clients/ssm';

import { ParameterStoreApi } from './api';
import { ParameterStoreApiFactory } from './api/parameterStoreApiFactory';
import { ParameterStoreConfigProvider, ReloadableParameterStoreConfigProvider } from './config';

/**
 * Creates a default ParameterStoreAPI with a live AWS SSM client
 */
export const parameterStoreApiFactory: ParameterStoreApiFactory = {
  getApi: async (creds?: ConfigurationOptions) => {
    const ssm = new SSM(creds);
    return new ParameterStoreApi(ssm);
  },
};

/**
 * Creates a [[ValueProvider]] instance to load [[ProvidedConfigValue]] objects.
 */
export async function defaultValueProvider({
  creds,
  api,
}: {
  creds?: ConfigurationOptions;
  api?: ParameterStoreApi;
} = {}): Promise<ValueProvider> {
  const parameterStoreApi = api ?? (await parameterStoreApiFactory.getApi(creds));

  const parameterStoreProvider = new ParameterStoreConfigProvider(parameterStoreApi);

  const reloadableParameterStoreProvider = new ReloadableParameterStoreConfigProvider(parameterStoreApi);

  return new ValueProvider([parameterStoreProvider, reloadableParameterStoreProvider, new StaticConfigProvider()]);
}
