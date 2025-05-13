import { ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { attribute, hashKey } from '@aws/dynamodb-data-mapper-annotations';
import { Arrays, propertyOf, sleep } from '@paradoxical-io/common';
import { asBrandSafe, Brand, Milliseconds, notNullOrUndefined } from '@paradoxical-io/types';
import AWS from 'aws-sdk';

import { awsRethrow } from '../../errors';
import { DynamoDao } from '../mapper';
import { assertTableNameValid, DynamoTableName, dynamoTableName } from '../util';

type KeyValueNamespace = Brand<string, 'Namespace'>;

export interface KeyValueList<T> {
  items: T[];
  pagePointer?: KeyValueTablePageItem;
}

export type KeyValueTablePageItem = Brand<AWS.DynamoDB.Key, 'KeyValueTablePageItem'>;

export class KeyValueTableDao implements DynamoDao {
  @hashKey()
  key!: KeyValueNamespace;

  @attribute()
  data!: string;
}

/**
 * The key value table is used for global, unsorted key dumps. This can be used for adhoc keys and
 * data storage, but should not be used for anything that requires (or even could require) batch retrieval
 *
 * For example, good usages of this class are for de-duping global events, storing temporary counters, etc.
 *
 * Bad usages of this are storing business level data for users or accounts. Those things should go in the
 * {@link PartitionedKeyValueTable} which allows things to be partitioned by user or account, etc.  The partition table
 * can then let you store individual keys but then in one go retrieve all the relevant keys by partition (user/etc)
 *
 * If you are unsure which to use, prefer the partition table and NOT this table.
 */
export class KeyValueTable {
  private readonly dynamo: AWS.DynamoDB;

  private readonly namespace: string;

  private readonly tableName: string;

  constructor({
    namespace = 'global',
    dynamo = new AWS.DynamoDB(),
    tableName = dynamoTableName('keys'),
  }: {
    namespace?: string;
    dynamo?: AWS.DynamoDB;
    tableName?: DynamoTableName;
  } = {}) {
    assertTableNameValid(tableName);

    this.namespace = namespace;

    this.tableName = tableName;

    this.dynamo = dynamo;
  }

  async get<T>(id: string): Promise<T | undefined> {
    try {
      return await this.getRaw<T>(this.key(id));
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return undefined;
      }

      throw e;
    }
  }

  async getBatch<T>(id: string[]): Promise<T[]> {
    return this.getRawBatch<T>(id.map(i => this.key(i)));
  }

  async set<T>(id: string, data: T): Promise<void> {
    await this.setRaw({
      key: this.key(id),
      data: JSON.stringify(data),
    });
  }

  async *streamAll<T>(
    perPage: number,
    opts?: {
      minimumDelayBetween?: Milliseconds;
      keyContains?: string;
    }
  ): AsyncGenerator<[string, T]> {
    let result: KeyValueList<[string, T]> | undefined;
    do {
      const delayPromise = opts?.minimumDelayBetween ? sleep(opts?.minimumDelayBetween) : Promise.resolve();
      result = await this.listAll<string, T>({
        pageItem: result?.pagePointer,
        limit: perPage,
        keyContains: opts?.keyContains,
      });

      if (result?.items) {
        for (const item of result.items) {
          yield item;
        }
      }

      await delayPromise;
    } while (result?.pagePointer);
  }

  async listAll<K, V>({
    pageItem,
    limit,
    keyContains,
  }: {
    pageItem?: KeyValueTablePageItem;
    limit?: number;
    keyContains?: string;
  } = {}): Promise<KeyValueList<[K, V]> | undefined> {
    const scan: AWS.DynamoDB.Types.ScanInput = {
      TableName: this.tableName,
      Limit: limit ?? 1000,
      FilterExpression: keyContains ? `contains(#key, :val)` : undefined,
      ExpressionAttributeValues: {
        ':val': {
          S: keyContains,
        },
      },
      ExpressionAttributeNames: {
        '#key': 'key',
      },
    };

    if (pageItem) {
      scan.ExclusiveStartKey = pageItem;
    }

    const result = await this.dynamo
      .scan(scan)
      .promise()
      .catch(awsRethrow(`${pageItem}`));

    if (result) {
      const data: Array<[K, V]> | undefined = result.Items?.map(i => [i['key'].S, i['data'].S])
        .filter(kv => notNullOrUndefined(kv[1]) && notNullOrUndefined(kv[0]))
        .map(kv => [kv[0] as unknown as K, JSON.parse(kv[1]!) as V]);

      if (data) {
        return {
          items: data,
          pagePointer: asBrandSafe(result.LastEvaluatedKey),
        };
      }
    }

    return undefined;
  }

  async delete(id: string): Promise<void> {
    await this.deleteRaw(this.key(id));
  }

  private key(id: string): KeyValueNamespace {
    if (this.namespace.length > 0) {
      return `${this.namespace}.${id}` as KeyValueNamespace;
    }

    return id as KeyValueNamespace;
  }

  private async getRaw<T>(id: KeyValueNamespace): Promise<T | undefined> {
    const result = await this.getRawBatch<T>([id]);

    if (result.length === 1) {
      return result[0];
    }

    return undefined;
  }

  private async getRawBatch<T>(id: KeyValueNamespace[]): Promise<T[]> {
    const groups = Arrays.grouped(id, 100);

    const results: T[] = [];

    for (const group of groups) {
      const result = await this.dynamo
        .batchGetItem({
          RequestItems: {
            [this.tableName]: {
              Keys: group.map(i => ({
                [propertyOf<KeyValueTableDao>('key')]: {
                  S: i,
                },
              })),
            },
          },
        })
        .promise()
        .catch(awsRethrow(id.join(',')));

      if (result) {
        const data = result.Responses?.[this.tableName]
          ?.map(i => i[propertyOf<KeyValueTableDao>('data')]?.S)
          .filter(notNullOrUndefined);

        if (data) {
          results.push(...data.map(d => JSON.parse(d) as T));
        }
      }
    }

    return results;
  }

  private async setRaw(data: KeyValueTableDao): Promise<void> {
    await this.dynamo
      .putItem({
        TableName: this.tableName,
        Item: {
          [propertyOf<KeyValueTableDao>('key')]: {
            S: data.key,
          },
          [propertyOf<KeyValueTableDao>('data')]: {
            S: data.data,
          },
        },
      })
      .promise()
      .catch(awsRethrow(data.key));
  }

  private async deleteRaw(id: KeyValueNamespace): Promise<void> {
    await this.dynamo
      .deleteItem({
        TableName: this.tableName,
        Key: {
          [propertyOf<KeyValueTableDao>('key')]: {
            S: id,
          },
        },
      })
      .promise()
      .catch(awsRethrow(id));
  }
}
