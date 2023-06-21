type Block = (() => Promise<void>) | (() => void);
type Env = 'local' | 'dev' | 'prod';

export function useMockEnv(env: Env) {
  process.env.PARADOX_ENV = env;
}

export async function usingEnv(env: Env, block: Block) {
  const previousEnv = (process.env.PARADOX_ENV ?? 'local') as Env;

  useMockEnv(env);

  const result = block();

  if (result instanceof Promise) {
    await result;
  }

  useMockEnv(previousEnv);
}
