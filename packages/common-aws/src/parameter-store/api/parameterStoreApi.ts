import {
  DescribeParametersCommand,
  GetParameterCommand,
  GetParametersCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { Arrays, Limiter, retry as autoRetry } from '@paradoxical-io/common';
import { log } from '@paradoxical-io/common-server';
import { ErrorCode, ErrorWithCode, isErrorWithCode } from '@paradoxical-io/types';
import retry = require('async-retry');

export class ParameterStoreApi {
  constructor(private ssm: SSMClient) {}

  async listParameters(): Promise<string[]> {
    const params: string[] = [];

    let nextToken: string | undefined;

    do {
      const command = new DescribeParametersCommand({
        NextToken: nextToken,
      });

      const described = await this.ssm.send(command);

      if (described.Parameters) {
        Array.from(described.Parameters.values())
          .filter(p => p !== undefined)
          .map(p => params.push(p.Name!));
      }

      nextToken = described.NextToken;
    } while (nextToken);

    return params;
  }

  @autoRetry()
  async getParameters(keys: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    const limiter = new Limiter({ maxConcurrent: 10 });

    if (keys.length === 0) {
      return result;
    }

    const groupPromises = Arrays.grouped(keys, 10).map(chunk =>
      limiter.wrap(async () => {
        const command = new GetParametersCommand({
          Names: chunk,
          WithDecryption: true,
        });

        const response = await this.ssm.send(command);

        response.Parameters?.forEach(p => {
          if (p.Name && p.Value) {
            result.set(p.Name, p.Value);
          }
        });
      })
    );

    await Promise.all(groupPromises);

    return result;
  }

  /**
   * Loads the parameter value from parameter store, decrypting if necessary.
   *
   * In order to take advantage of decryption, the application must have the proper role policy
   * for the KMS key in AWS.
   * @param name The paramter name in Parameter Store.
   * @param withDecrypt Whether or not to decrypt the value from Parameter Store.
   * @throws ErrorWithCode ErrorCode.ItemNotFound if the parameter is not found.
   */
  async getParameter(name: string, withDecrypt = false): Promise<string> {
    return retry(
      async bail => {
        try {
          const command = new GetParameterCommand({
            Name: name,
            WithDecryption: withDecrypt,
          });

          const response = await this.ssm.send(command);

          const param = response.Parameter;

          if (param && param.Value) {
            return param.Value;
          }

          return '';
        } catch (err) {
          if (err instanceof ParameterNotFound) {
            bail(
              new ErrorWithCode(ErrorCode.ItemNotFound, {
                data: { parameter: name },
                errorMessage: `Parameter Store key '${name}' not found`,
              })
            );
          }

          throw err;
        }
      },
      {
        onRetry: (error, num) => {
          log.warn(`Unable to load parameter store value ${name}. Retry attempt ${num}. Trying again`, error);
        },
      }
    );
  }

  /**
   * Loads the parameter value from parameter store, decrypting if necessary. Returns undefined if the parameter is not found.
   *
   * In order to take advantage of decryption, the application must have the proper role policy
   * for the KMS key in AWS.
   * @param name The paramter name in Parameter Store.
   * @param withDecrypt Whether or not to decrypt the value from Parameter Store.
   */
  async getParameterSafe(name: string, withDecrypt = false): Promise<string | undefined> {
    try {
      return await this.getParameter(name, withDecrypt);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === ErrorCode.ItemNotFound) {
        return undefined;
      }
      throw err;
    }
  }

  /**
   * Save a value in parameter store. If the parameter already exists, it will be overwritten.
   * @param name The parameter name in parameter store
   * @param value The value to persist
   * @param encrypt Whether or not to encrypt the value.
   */
  async setParameter(name: string, value: string, encrypt: boolean): Promise<void> {
    const command = new PutParameterCommand({
      Name: name,
      Value: value,
      Overwrite: true,
      Type: encrypt ? 'SecureString' : 'String',
    });

    await this.ssm.send(command);
  }
}
