import AWS from 'aws-sdk';
import fs from 'fs';

export async function downloadObject({
  bucket,
  filePath,
  objectKey,
  s3 = new AWS.S3(),
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
  s3?: AWS.S3;
}): Promise<boolean> {
  const file = fs.createWriteStream(filePath);

  const s3Object = await s3.getObject({ Bucket: bucket, Key: objectKey });

  return new Promise((resolve, reject) => {
    s3Object
      .createReadStream()
      .on('end', () => resolve(true))
      .on('error', error => reject(error))
      .pipe(file);
  });
}
