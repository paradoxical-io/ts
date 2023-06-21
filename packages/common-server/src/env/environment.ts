import { Env } from '@paradoxical-io/types';
import os from 'os';

const envKey = 'PARADOX_ENV';

/**
 * Returns true if running on a remote machine and false if running on a local developer machine
 */
export const isRemote = os.platform() !== 'darwin';

/**
 * Returns true if running on a local developer machine. Note that this is set solely based on where
 * code is executing and *not* based on the config being used. Use currentEnvironment === 'local'
 * if you want to check if config a local machine is being used. As an example, if you are running code
 * on a local dev machine using env=dev to hit services in the paradox-dev AWS environment, then isLocal will be true
 * and currentEnvironment() will be 'dev'.
 */
export const isLocal = !isRemote;

/**
 * isProd exposes if the current environment is production
 */
export function isProd(): boolean {
  return currentEnvironment() === 'prod';
}

/**
 * Sets the current environment
 */
export function setEnvironment(env: Env): void {
  // verify input, just in case
  if (envNames.indexOf(env) < 0) {
    throw new Error(`Unknown environment: ${env}`);
  }

  process.env[envKey] = env;
}

/**
 * Returns the current environment specified by the PARADOX_ENV env var
 * if the env is not set, uses local
 */
export function currentEnvironment(): Env {
  const env = process.env[envKey];

  if (!env) {
    throw new Error(
      `Current environment is not set, please set the environment variable: ${envKey} to one of the following 'local', 'dev', 'prod' depending on the context`
    );
  }

  if (envNames.indexOf(env as Env) < 0) {
    throw new Error(`Unknown environment: ${env}`);
  }

  return env as Env;
}

export function tryParse(s: string): Env | undefined {
  const parsed = envNames.indexOf(s as Env);
  if (parsed < 0) {
    return undefined;
  }

  return s as Env;
}

/**
 * String names of all known environments
 */
export const envNames: Env[] = ['local', 'dev', 'prod'];
