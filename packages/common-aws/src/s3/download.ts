import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import { Readable } from 'stream';

export async function downloadObject({
  bucket,
  filePath,
  objectKey,
  s3 = new S3Client(),
}: {
  /**
   * S3 bucket where object is located
   */
  bucket: string;

  /**
   * Where to write downloaded file to
   */
  filePath: string;

  /**
   * Key of object in S3 bucket
   */
  objectKey: string;

  /**
   * S3 instance
   */
  s3?: S3Client;
}): Promise<boolean> {
  const file = fs.createWriteStream(filePath);

  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey });

  const { Body } = await s3.send(command);

  if (Body instanceof Readable) {
    return new Promise((resolve, reject) => {
      Body.on('end', () => resolve(true))
        .on('error', error => reject(error))
        .pipe(file);
    });
  }

  return false;
}
