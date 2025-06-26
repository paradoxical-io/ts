import { gitRootSync, log } from '@paradoxical-io/common-server';
import { Env } from '@paradoxical-io/types';
import * as path from 'path';

export interface Profile {
  profile: string;
}

/**
 * Sets the current environment to use the AWS credentials from the shared credentials file
 * @param requestedEnv
 */
export function useAWS(requestedEnv: Env | Profile): void {
  let env = requestedEnv;
  if (env === 'local') {
    log.debug("Running 'local' environment. Using dev env for all aws resources");
    env = 'dev';
  }

  const { configPath, credentialsPath, profile } = resolveConfig(env);

  process.env.AWS_PROFILE = profile;
  process.env.AWS_SHARED_CREDENTIAL_FILE = credentialsPath;
  process.env.AWS_CONFIG_FILE = configPath;
  process.env.AWS_SDK_LOAD_CONFIG = 'true';

  log.debug(`Configured AWS to use profile ${profile}`);
}

function resolveConfig(env: Env | Profile) {
  const repoBase = gitRootSync();
  const awsPath = path.join(repoBase, '.aws');

  const configPath = path.join(awsPath, 'config');
  const credentialsPath = path.join(awsPath, 'credentials');

  const profile = typeof env === 'object' ? env.profile : `${env}-terraform`;

  return {
    configPath,
    credentialsPath,
    profile,
  };
}
