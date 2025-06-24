import { attribute, hashKey } from '@aws/dynamodb-data-mapper-annotations';
import { defaultTimeProvider, propertiesOf, TimeProvider, toEpochSeconds } from '@paradoxical-io/common';
import { Lock, LockApi, log } from '@paradoxical-io/common-server';
import { EpochSeconds } from '@paradoxical-io/types';
import AWS, { DynamoDB } from 'aws-sdk';

import { awsRethrow, hasAWSErrorCode } from '../errors';
import { DynamoDao } from './mapper';
import { DynamoTableName, dynamoTableName } from './util';

export class DynamoLock implements LockApi {
  private dynamo: AWS.DynamoDB;

  private tableName: string;

  private timeProvider: TimeProvider;

  constructor({
    dynamo = new AWS.DynamoDB(),
    tableName = dynamoTableName('locks'),
    timeProvider = defaultTimeProvider(),
  }: {
    dynamo?: AWS.DynamoDB;
    tableName?: DynamoTableName;
    timeProvider?: TimeProvider;
  } = {}) {
    this.dynamo = dynamo;

    this.tableName = tableName;

    this.timeProvider = timeProvider;
  }

  async tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined> {
    // dynamo TTL's are in epoch SECONDS ¯\_(ツ)_/¯

    const now = this.timeProvider.epochMS();

    const nowEpochSeconds = toEpochSeconds(now);

    const expiresAt = (timeoutSeconds + nowEpochSeconds) as EpochSeconds;

    const payload: DynamoLockEntry = { key, expiresAt };

    const keys = propertiesOf<DynamoLockEntry>();
    try {
      const old = await this.dynamo
        .updateItem({
          TableName: this.tableName,
          ReturnValues: 'UPDATED_OLD',
          Key: {
            key: {
              S: key,
            },
          },
          UpdateExpression: 'set #expires_at = :expires_at',
          ConditionExpression: `attribute_not_exists(#key) OR :now >= #expires_at`,
          ExpressionAttributeNames: {
            '#key': keys('key'),
            '#expires_at': keys('expiresAt'),
          },
          ExpressionAttributeValues: {
            ':expires_at': {
              N: payload.expiresAt.toString(),
            },
            ':now': {
              N: nowEpochSeconds.toString(),
            },
          },
        } as DynamoDB.Types.UpdateItemInput)
        .promise()
        .catch(awsRethrow());

      let expired = '';
      if (old.Attributes) {
        expired = `because previous lock expired at ${old.Attributes['expiresAt'].N}`;
      }

      log.info(
        `Acquired lock id: ${key}, expires at ${payload.expiresAt}, evaluated with now as ${now.toString()} ${expired}`
      );

      return {
        type: 'lock',
        release: async (): Promise<void> => {
          await this.dynamo
            .deleteItem({
              TableName: this.tableName,
              Key: {
                key: {
                  S: key,
                },
              },
            })
            .promise()
            .catch(awsRethrow());

          log.info(`Released lock id: ${key}`);
        },
      };
    } catch (e) {
      if (hasAWSErrorCode(e) && e.code === 'ConditionalCheckFailedException') {
        log.info(`Cannot acquire lock id: ${key}, it is still held`);

        return undefined;
      }

      throw e;
    }
  }
}

interface DynamoLockEntry {
  key: string;
  expiresAt: EpochSeconds;
}

export class DynamoLockEntryDao implements DynamoLockEntry, DynamoDao {
  @hashKey()
  key!: string;

  @attribute()
  expiresAt!: EpochSeconds;
}
