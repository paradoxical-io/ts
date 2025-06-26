import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Docker, newDocker } from '@paradoxical-io/common-server/dist/test/docker';

export class S3Docker {
  constructor(public container: Docker, public s3: S3Client) {}

  async newBucket(bucket = 'default') {
    const command = new CreateBucketCommand({
      Bucket: bucket,
    });

    await this.s3.send(command);
  }
}

export async function newS3Docker(): Promise<S3Docker> {
  const container = await newDocker({
    image: 'lphoward/fake-s3',
    exposePorts: [4569],
  });

  await container.waitForLogs('WEBrick::HTTPServer#start');

  const base = `http://localhost:${container.mapping[4569]}`;

  const s3 = new S3Client({
    endpoint: base,
    forcePathStyle: true,
    region: 'us-west-2',
  });

  return new S3Docker(container, s3);
}
