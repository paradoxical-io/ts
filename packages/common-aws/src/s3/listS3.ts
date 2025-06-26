import { ListObjectsCommand, ListObjectsCommandInput, S3Client } from '@aws-sdk/client-s3';

/**
 * Streams all objects as an async generator
 * @param cognito
 * @param pool
 */
export async function* getAllObjects(
  params: ListObjectsCommandInput,
  s3: S3Client = new S3Client()
): AsyncGenerator<string> {
  let marker: string | undefined = params.Marker;
  while (true) {
    const command = new ListObjectsCommand({ ...params, Marker: marker });

    const items = await s3.send(command);

    if (items.Contents) {
      for (const content of items.Contents) {
        if (content.Key) {
          yield content.Key;
        }
      }
    }

    if (items.IsTruncated && items.Contents) {
      marker = items.Contents[items.Contents.length - 1]!.Key;
    } else {
      return;
    }
  }
}
