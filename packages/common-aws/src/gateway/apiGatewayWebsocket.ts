import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

import { Logger, Monitoring, noOpMonitoring } from '../monitoring';

export class ApiGatewayWebsocket {
  private readonly api: ApiGatewayManagementApiClient;

  private readonly logger: Logger;

  constructor({
    api = new ApiGatewayManagementApiClient(),
    monitoring = noOpMonitoring(),
  }: {
    api?: ApiGatewayManagementApiClient;
    monitoring?: Monitoring;
  } = {}) {
    this.api = api;
    this.logger = monitoring.logger;
  }

  static createEndpoint(endpoint: string): ApiGatewayWebsocket {
    return new ApiGatewayWebsocket({
      api: new ApiGatewayManagementApiClient({
        endpoint: endpoint.replace('wss', 'https'),
      }),
    });
  }

  /**
   * Returns true if able to write to the connection, false if not
   * @param connectionId
   * @param message
   */
  async publish<T>(connectionId: string, message: T): Promise<boolean> {
    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message),
      });

      await this.api.send(command);
    } catch (e) {
      // GoneException
      if (e instanceof GoneException) {
        // this indicates the connection is gone and is ok to swallow
        return false;
      }

      this.logger.error(`Error publishing to connection id: ${connectionId}`, e);

      return false;
    }

    return true;
  }
}
