import { load } from './loader';

function schemaShape() {
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
  };
}

interface Config {
  host: {
    auth: {
      allowAssume: boolean;
    };
  };
}

test('loads from an object', async () => {
  const config = load<Config>({}, 'local', schemaShape);
  expect(config).not.toBeNull();
  expect(config.host.auth.allowAssume).toEqual(true);
});

test('loads from an with defaults', async () => {
  const config = load<Config>({ host: { auth: { allowAssume: false } } }, 'local', schemaShape);
  expect(config).not.toBeNull();
  expect(config.host.auth.allowAssume).toEqual(false);
});
