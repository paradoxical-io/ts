import { ConfigurationOptions } from 'aws-sdk';

import { ParameterStoreApi } from './parameterStoreApi';

export interface ParameterStoreApiFactory {
  getApi(creds?: ConfigurationOptions): Promise<ParameterStoreApi>;
}
