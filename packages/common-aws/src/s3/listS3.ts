/**
 * Streams all users as an async generator
 * @param cognito
 * @param pool
 */

import AWS from 'aws-sdk';
import { ListObjectsRequest } from 'aws-sdk/clients/s3';

import { awsRethrow } from '../errors';

export async function* getAllObjects(params: ListObjectsRequest, s3: AWS.S3 = new AWS.S3()): AsyncGenerator<string> {
  let marker: string | undefined = params.Marker;
  while (true) {
    const items = await s3
      .listObjects({ ...params, Marker: marker })
      .promise()
      .catch(awsRethrow());

    if (items.Contents) {
      for (const content of items.Contents) {
        if (content.Key) {
          yield content.Key;
        }
      }
    }

    if (items.IsTruncated && items.Contents) {
      marker = items.Contents[items.Contents.length - 1].Key;
    } else {
      return;
    }
  }
}
