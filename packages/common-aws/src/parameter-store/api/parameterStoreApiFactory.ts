import { AwsCredentialIdentity } from '@smithy/types';

import { ParameterStoreApi } from './parameterStoreApi';

export interface ParameterStoreApiFactory {
  getApi(creds?: AwsCredentialIdentity): Promise<ParameterStoreApi>;
}
