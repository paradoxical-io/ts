import { safeExpect } from '@paradoxical-io/common-test';

import { ConfigBlock } from './contracts';
import { load } from './loader';
import { ProvidedConfigValue } from './providers/providedConfigValue';

function schemaShape(): ConfigBlock<ProvidedConfig> {
  return {
    host: {
      auth: {
        allowAssume: {
          doc: "Whether to use assumed auth. The assumed auth username will come in as the value using scheme 'assume'",
          format: Boolean,
          default: true,
          env: 'HOST_AUTH_ALLOW_ASSUME',
        },
      },
    },
    dynamic: {
      providerType: {
        doc: 'How to load the value',
        default: 'ParameterStore',
        format: ['ParameterStore', 'Static'],
      },
      value: {
        doc: 'The ssm path',
        format: String,
        default: '/path/to/ssm',
      },
    },
  };
}

interface ProvidedConfig {
  host: {
    auth: {
      allowAssume: boolean;
    };
  };
  dynamic: ProvidedConfigValue;
}

test('loads from an object', async () => {
  const config = load<ProvidedConfig>({}, 'local', schemaShape);

  safeExpect(config).not.toBeNull();
  safeExpect(config.host.auth.allowAssume).toEqual(true);
  safeExpect(config.dynamic.providerType).toEqual('ParameterStore');
  safeExpect(config.dynamic.value).toEqual('/path/to/ssm');
});

test('loads from an with defaults', async () => {
  const config = load<ProvidedConfig>({ host: { auth: { allowAssume: false } } }, 'local', schemaShape);

  safeExpect(config).not.toBeNull();
  safeExpect(config.host.auth.allowAssume).toEqual(false);
});
