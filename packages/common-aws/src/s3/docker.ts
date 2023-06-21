import { Docker, newDocker } from '@paradox/common-server/dist/test/docker';
import AWS from 'aws-sdk';

import { awsRethrow } from '../errors';

export class S3Docker {
  constructor(public container: Docker, public s3: AWS.S3) {}

  async newBucket(bucket = 'default') {
    await this.s3
      .createBucket({
        Bucket: bucket,
      })
      .promise()
      .catch(awsRethrow());
  }
}

export async function newS3Docker(): Promise<S3Docker> {
  const container = await newDocker({
    image: 'lphoward/fake-s3',
    exposePorts: [4569],
  });

  await container.waitForLogs('WEBrick::HTTPServer#start');

  const base = `http://localhost:${container.mapping[4569]}`;

  const s3 = new AWS.S3({
    endpoint: base,
    s3ForcePathStyle: true,
    region: 'us-west-2',
  });

  return new S3Docker(container, s3);
}
