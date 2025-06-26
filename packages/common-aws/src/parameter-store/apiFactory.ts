import { SSMClient } from '@aws-sdk/client-ssm';
import { StaticConfigProvider, ValueProvider } from '@paradoxical-io/common-server';
import { AwsCredentialIdentity } from '@smithy/types';

import { ParameterStoreApi } from './api';
import { ParameterStoreApiFactory } from './api/parameterStoreApiFactory';
import { ParameterStoreConfigProvider, ReloadableParameterStoreConfigProvider } from './config';

/**
 * Creates a default ParameterStoreAPI with a live AWS SSM client
 */
export const parameterStoreApiFactory: ParameterStoreApiFactory = {
  getApi: async (creds?: AwsCredentialIdentity) => {
    const ssm = new SSMClient({
      credentials: creds,
    });
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
  creds?: AwsCredentialIdentity;
  api?: ParameterStoreApi;
} = {}): Promise<ValueProvider> {
  const parameterStoreApi = api ?? (await parameterStoreApiFactory.getApi(creds));

  const parameterStoreProvider = new ParameterStoreConfigProvider(parameterStoreApi);

  const reloadableParameterStoreProvider = new ReloadableParameterStoreConfigProvider(parameterStoreApi);

  return new ValueProvider([parameterStoreProvider, reloadableParameterStoreProvider, new StaticConfigProvider()]);
}
