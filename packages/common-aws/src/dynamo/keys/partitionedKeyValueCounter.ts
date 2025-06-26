import { attribute, hashKey, rangeKey } from '@aws/dynamodb-data-mapper-annotations';
import {
  BatchGetItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { Arrays, propertyOf } from '@paradoxical-io/common';
import { CompoundKey, SortKey } from '@paradoxical-io/types';

import { DynamoDao } from '../mapper';
import { assertTableNameValid, DynamoTableName, dynamoTableName } from '../util';
import { log } from '@paradoxical-io/common-server';

export class PartitionedKeyCounterTableDao<T extends string = string> implements DynamoDao {
  @hashKey()
  partitionKey!: T;

  @rangeKey()
  sortKey!: SortKey;

  @attribute()
  count?: number;
}

export interface KeyCount<K extends string = string> {
  partitionKey: K;
  sortKey: SortKey;
  count?: number;
}

/**
 * An atomic key value counter for partitioned values
 */
export class PartitionedKeyValueCounter {
  private readonly dynamo: DynamoDBClient;

  private readonly tableName: string;

  constructor({
                dynamo = new DynamoDBClient(),
                tableName = dynamoTableName('partitioned_keys'),
              }: {
    dynamo?: DynamoDBClient;
    tableName?: DynamoTableName;
  }) {
    assertTableNameValid(tableName);

    this.tableName = tableName;

    this.dynamo = dynamo;
  }

  async get<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined> {
    try {
      const result = await this.getRaw([
        {
          sortKey: this.sortKey(id),
          partitionKey: id.partition,
        },
      ]);

      if (result) {
        return result?.[0]?.count;
      }

      return undefined;
    } catch (e) {
      if (e instanceof ResourceNotFoundException) {
        return undefined;
      }

      throw e;
    }
  }

  async incr<P extends string = string>(id: CompoundKey<P, number>, by = 1): Promise<number> {
    return this.incrRaw({
      sortKey: this.sortKey(id),
      partitionKey: id.partition,
      count: by,
    });
  }

  async decr<P extends string = string>(id: CompoundKey<P, number>, by = 1): Promise<number> {
    return this.incr(id, by * -1);
  }

  async delete<P extends string = string>(id: CompoundKey<P, number>): Promise<void> {
    await this.deleteRaw({
      partitionKey: id.partition,
      sortKey: this.sortKey(id),
    });
  }

  private sortKey<P extends string>(key: CompoundKey<P, unknown>): SortKey {
    if (key.namespace.length > 0) {
      return `${key.namespace}.${key.sort}` as SortKey;
    }

    return key.sort;
  }

  private async getRaw<K extends string = string>(
    keys: Array<PartitionedKeyCounterTableDao<K>>
  ): Promise<Array<KeyCount<K>>> {
    const promises = Arrays.grouped(keys, 100).map(async idGroup => {
      const command = new BatchGetItemCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: idGroup.map(data => ({
              [propertyOf<PartitionedKeyCounterTableDao>('partitionKey')]: {
                S: data.partitionKey,
              },
              [propertyOf<PartitionedKeyCounterTableDao>('sortKey')]: {
                S: data.sortKey,
              },
            })),
          },
        },
      });

      const result = await this.dynamo.send(command);

      if (result?.Responses) {
        return result.Responses[this.tableName]!.map(result => {
          const item: KeyCount<K> = {
            partitionKey: result[propertyOf<PartitionedKeyCounterTableDao>('partitionKey')]!.S!.toString() as K,
            sortKey: result[propertyOf<PartitionedKeyCounterTableDao>('sortKey')]!.S!.toString() as SortKey,
            count: Number(result[propertyOf<PartitionedKeyCounterTableDao>('count')]?.N ?? 0),
          };

          return item;
        });
      }

      return [];
    });

    const results = await Promise.all(promises);

    return results.flatMap(i => i);
  }

  private async incrRaw(data: PartitionedKeyCounterTableDao): Promise<number> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        [propertyOf<PartitionedKeyCounterTableDao>('partitionKey')]: {
          S: data.partitionKey,
        },
        [propertyOf<PartitionedKeyCounterTableDao>('sortKey')]: {
          S: data.sortKey,
        },
      },
      UpdateExpression: 'add #count :value',
      ExpressionAttributeNames: {
        '#count': propertyOf<PartitionedKeyCounterTableDao>('count'),
      },
      ExpressionAttributeValues: {
        ':value': {
          N: (data.count ?? 0).toString(),
        },
      },
      ReturnValues: 'UPDATED_NEW',
    });

    try {
      const result = await this.dynamo.send(command);

      return Number(result.Attributes![propertyOf<PartitionedKeyCounterTableDao>('count')]!.N);
    } catch (e) {
      log.error(`failed to increment ${JSON.stringify({ sortKey: data.sortKey, partitionKey: data.partitionKey })}`, e);

      throw e;
    }
  }

  private async deleteRaw(data: PartitionedKeyCounterTableDao): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        [propertyOf<PartitionedKeyCounterTableDao>('partitionKey')]: {
          S: data.partitionKey,
        },
        [propertyOf<PartitionedKeyCounterTableDao>('sortKey')]: {
          S: data.sortKey,
        },
      },
    });

    try {
      await this.dynamo.send(command);
    } catch (e) {
      log.error(`failed to delete ${JSON.stringify({ sortKey: data.sortKey, partitionKey: data.partitionKey })}`, e);

      throw e;
    }
  }
}
