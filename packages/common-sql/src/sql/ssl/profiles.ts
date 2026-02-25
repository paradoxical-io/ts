// aws-ssl-profiles is a transitive dependency of mysql2 that provides
// up-to-date Amazon RDS CA certificate bundles
// eslint-disable-next-line @typescript-eslint/no-var-requires
const awsSslProfiles: { ca: string[] } = require('aws-ssl-profiles');

export const AWS_RDS_PROFILE = {
  ca: awsSslProfiles.ca,
};
