import { log } from '@paradox/common-server';
import AWS from 'aws-sdk';

import { awsRethrow } from '../errors';

export class ApiGatewayWebsocket {
  constructor(private api: AWS.ApiGatewayManagementApi = new AWS.ApiGatewayManagementApi()) {}

  static createEndpoint(endpoint: string): ApiGatewayWebsocket {
    return new ApiGatewayWebsocket(
      new AWS.ApiGatewayManagementApi({
        endpoint: endpoint.replace('wss', 'https'),
      })
    );
  }

  /**
   * Returns true if able to write to the connection, false if not
   * @param connectionId
   * @param message
   */
  async publish<T>(connectionId: string, message: T): Promise<boolean> {
    try {
      await this.api
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(message),
        })
        .promise()
        .catch(awsRethrow(`failed writing to connection id ${connectionId}`));
    } catch (e) {
      // GoneException
      if ((e as AWS.AWSError).statusCode === 410) {
        // this indicates the connection is gone and is ok to swallow
        return false;
      }

      log.error(`Error publishing to connection id: ${connectionId}`, e);

      return false;
    }

    return true;
  }
}
