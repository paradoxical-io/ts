import { ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { attribute, hashKey, rangeKey } from '@aws/dynamodb-data-mapper-annotations';
import { Arrays, isEqual, jitter, propertyOf, sleep } from '@paradoxical-io/common';
import { consistentMd5, log, timed } from '@paradoxical-io/common-server';
import { CompoundKey, Milliseconds, notNullOrUndefined, nullOrUndefined, SortKey } from '@paradoxical-io/types';
import AWS from 'aws-sdk';
import _ from 'lodash';

import { awsRethrow, hasAWSErrorCode } from '../../errors';
import { DynamoDao } from '../mapper';
import { assertTableNameValid, DynamoTableName, dynamoTableName } from '../util';

export class PartitionedKeyValueTableDao<T extends string> implements DynamoDao {
  @hashKey()
  partitionKey!: T;

  @rangeKey()
  sortKey!: SortKey;

  @attribute()
  data!: string;

  @attribute()
  md5?: string;
}

export interface PartitionKeyMappings {
  sortKeyFieldName: string;
  sortKeyFieldAWSType: 'S' | 'N';
  partitionKeyFieldName: string;
  dataFieldName: string;
  md5: 'md5';
}

/**
 * A key value table where the _sort_ key is namespaced.
 *
 * Allows to query all the values based on the partition key.
 */
export class PartitionedKeyValueTable {
  readonly dynamo: AWS.DynamoDB;

  readonly tableName: string;

  constructor({
    dynamo = new AWS.DynamoDB(),
    tableName = dynamoTableName('partitioned_keys'),
  }: {
    dynamo?: AWS.DynamoDB;
    tableName?: DynamoTableName;
  } = {}) {
    assertTableNameValid(tableName);

    this.tableName = tableName;

    this.dynamo = dynamo;
  }

  /**
   * Method to append data to a key that points to a value list.
   *
   * @param key compound key that indexes to a `value[]`
   * @param data to be appended to the key
   * @param setInclusion if this returns `true`, then nothing is added to the list
   * @returns void
   */
  async addToSet<K extends string, V>(
    key: CompoundKey<K, V[]>,
    data: V | V[],
    setInclusion: (left: V, right: V) => boolean = (left, right) => _.isEqual(left, right)
  ): Promise<boolean> {
    const previous = await this.getRaw(key);

    const normalized = Array.isArray(data) ? data : [data];

    const itemExists = (item: V) => previous?.data?.some(existing => setInclusion(item, existing));

    // all the data already exists in the old data
    if (normalized.every(itemExists)) {
      return false;
    }

    const next = [...(previous?.data ?? []), ...normalized.filter(i => !itemExists(i))];

    if (!(await this.setIfMd5Matches(key, next, previous?.md5))) {
      log.info(`Unable to add key ${JSON.stringify(key)} to set because md5 does not match. Trying again`);

      await sleep((250 + jitter(100 as Milliseconds)) as Milliseconds);

      return this.addToSet(key, data, setInclusion);
    }

    return true;
  }

  /**
   * Clears an entire partition, including all sort keys
   * @param partition
   */
  async clear<P extends string>(partition: P): Promise<void> {
    await this.deletePartition(partition);
  }

  /**
   * Deletes only a specific sort key
   * @param key
   */
  async delete<P extends string>(key: CompoundKey<P>): Promise<void> {
    await this.deleteSortKey(key);
  }

  /**
   * If the key exists in the DynamoDB table, returns true. Otherwise, returns false.
   * @param key
   */
  async exists<K extends string, V>(key: CompoundKey<K, V>): Promise<boolean> {
    return this.existsRaw(key);
  }

  /**
   * Method to check if data exists on a list of values on a key.
   *
   * @param key compound key that indexes to a `value[]`
   * @param data to check if it exists in the value list
   * @param setInclusion function to check if element exists in a list
   * @returns
   */
  async existsInSet<K extends string, V>(
    key: CompoundKey<K, V[]>,
    data: V,
    setInclusion: (left: V, right: V) => boolean = (left, right) => _.isEqual(left, right)
  ): Promise<boolean> {
    const values = await this.get(key);

    if (nullOrUndefined(values)) {
      return false;
    }

    return values.some(v => setInclusion(v, data));
  }

  @timed()
  async get<T, P extends string>(key: CompoundKey<P, T>): Promise<T | undefined> {
    try {
      return (await this.getRaw<T, P>(key))?.data;
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return undefined;
      }

      throw e;
    }
  }

  /**
   * Lists all values in a partition
   * @param partition
   */
  async *listAll(partition: string): AsyncGenerator<Array<{ key: string; value: string }>> {
    try {
      const mappings = this.mappings();

      const load = async (lastKey: AWS.DynamoDB.Key | undefined) =>
        this.dynamo
          .query({
            TableName: this.tableName,
            KeyConditionExpression: `#partition = :partition`,
            ExpressionAttributeNames: {
              '#partition': mappings.partitionKeyFieldName,
            },
            ExclusiveStartKey: lastKey,
            ExpressionAttributeValues: {
              ':partition': {
                S: partition,
              },
            },
          })
          .promise()
          .catch(awsRethrow(`Partition: ${partition}`));

      let result = await load(undefined);

      if (result) {
        while (result.Items && (result.Items.length ?? 0) > 0) {
          yield result.Items?.map(i => ({
            // sometimes the data field is a string, sometimes its a count,
            value: i[mappings.dataFieldName]?.S ?? i['count']?.N ?? '',

            // sometimes the sort field is a string (raw json data), sometimes its a number like time for a range key,
            key: i[mappings.sortKeyFieldName]?.S ?? i[mappings.sortKeyFieldName]?.N ?? '-',
          }));

          if (result.LastEvaluatedKey) {
            result = await load(result.LastEvaluatedKey);
          } else {
            break;
          }
        }
      }
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return [];
      }

      throw e;
    }

    return [];
  }

  /**
   * Removes an element from a set of data.
   *
   * @param key compound key that indexes to a `value[]`
   * @param data to be removed from the set
   * @param setInclusion how to determine if the item is in the set
   * @returns
   */
  async removeFromSet<K extends string, V>(
    key: CompoundKey<K, V[]>,
    data: V | V[],
    setInclusion: (left: V, right: V) => boolean = (left, right) => _.isEqual(left, right)
  ): Promise<boolean> {
    const previous = await this.getRaw(key);

    if (nullOrUndefined(previous)) {
      return false;
    }

    const toRemove = Array.isArray(data) ? data : [data];

    const shouldBeRemoved = (v: V): boolean => toRemove.some(removal => setInclusion(v, removal));

    const updatedSet = previous?.data.filter(v => !shouldBeRemoved(v));

    if (!(await this.setIfMd5Matches(key, updatedSet, previous?.md5))) {
      await sleep((250 + jitter(100 as Milliseconds)) as Milliseconds);

      return this.removeFromSet(key, data, setInclusion);
    }

    return true;
  }

  /**
   * Removes an element from a set of data.
   *
   * @param key compound key that indexes to a `value[]`
   * @param toRemove how to determine which item to remove
   * @returns
   */
  async removeFromSetByKey<K extends string, V>(
    key: CompoundKey<K, V[]>,
    toRemove: (v: V) => boolean
  ): Promise<boolean> {
    const previous = await this.getRaw(key);

    if (nullOrUndefined(previous)) {
      return false;
    }
    const updatedSet = previous?.data.filter(v => !toRemove(v));

    if (!(await this.setIfMd5Matches(key, updatedSet, previous?.md5))) {
      await sleep((250 + jitter(100 as Milliseconds)) as Milliseconds);

      return this.removeFromSetByKey(key, toRemove);
    }

    return true;
  }

  async set<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void> {
    await this.setRawBatch([{ key, data }]);
  }

  async setBatch<T, P extends string>(keys: Array<{ key: CompoundKey<P, T>; data: T }>): Promise<void> {
    await this.setRawBatch(keys);
  }

  /**
   * Sets the value if it doesn't exist. Returns true if was inserted or false if not (due to duplicate found)
   *
   * Does this atomically.
   * @param key
   * @param data
   */
  async setIfNotExists<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<boolean> {
    try {
      await this.setRawAtomic(key, data);

      return true;
    } catch (e) {
      if (hasAWSErrorCode(e) && e.code === 'ConditionalCheckFailedException') {
        return false;
      }

      throw e;
    }
  }

  /**
   * Method to update data to a key that points to a value list.
   *
   * @param key compound key that indexes to a `value[]`
   * @param data to be appended to the key
   * @param setInclusion if this returns `true`, then nothing is added to the list
   * @returns void
   */
  async updateInSet<K extends string, V>(
    key: CompoundKey<K, V[]>,
    data: V,
    setInclusion?: (value: V) => boolean
  ): Promise<boolean> {
    const previous = await this.getRaw(key);

    if (nullOrUndefined(previous)) {
      return false;
    }

    const isItemToUpdate = setInclusion ?? ((v: V) => isEqual(data, v));

    // remove the old value and put in the updated value
    const updatedSet = [...previous?.data.filter(v => !isItemToUpdate(v)), data];

    if (!(await this.setIfMd5Matches(key, updatedSet, previous?.md5))) {
      await sleep((250 + jitter(100 as Milliseconds)) as Milliseconds);

      return this.removeFromSet(key, data, setInclusion);
    }

    return true;
  }

  protected sortKey<P extends string>(key: CompoundKey<P>): SortKey {
    if (key.namespace && key.namespace.length > 0) {
      return `${key.namespace}.${key.sort}` as SortKey;
    }

    return key.sort;
  }

  protected partitionKey<P extends string>(key: CompoundKey<P>): P {
    return key.partition;
  }

  protected mappings(): PartitionKeyMappings {
    return {
      sortKeyFieldName: propertyOf<PartitionedKeyValueTableDao<string>>('sortKey'),
      sortKeyFieldAWSType: 'S',
      partitionKeyFieldName: propertyOf<PartitionedKeyValueTableDao<string>>('partitionKey'),
      dataFieldName: propertyOf<PartitionedKeyValueTableDao<string>>('data'),
      md5: 'md5',
    };
  }

  protected async getRaw<T, P extends string>(key: CompoundKey<P, T>): Promise<{ data: T; md5?: string } | undefined> {
    try {
      const sortKey = this.sortKey(key);

      const mappings = this.mappings();

      const result = await this.dynamo
        .getItem({
          TableName: this.tableName,
          Key: {
            [mappings.sortKeyFieldName]: {
              [mappings.sortKeyFieldAWSType]: sortKey,
            },
            [mappings.partitionKeyFieldName]: {
              S: this.partitionKey(key),
            },
          },
        })
        .promise()
        .catch(awsRethrow(`Partition: ${key.partition}, Sort: ${sortKey}`));

      if (result) {
        const data = result.Item?.[mappings.dataFieldName].S;

        if (data) {
          return { data: JSON.parse(data) as T, md5: result.Item?.[mappings.md5]?.S };
        }
      }

      return undefined;
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return undefined;
      }

      throw e;
    }
  }

  protected async setIfMd5Matches<T, P extends string>(
    key: CompoundKey<P, T>,
    data: T,
    previousMd5: string | undefined
  ): Promise<boolean> {
    try {
      const sortKey = this.sortKey(key);

      const mappings = this.mappings();

      await this.dynamo
        .putItem({
          TableName: this.tableName,
          ExpressionAttributeNames: {
            '#md5': mappings.md5,
          },
          ExpressionAttributeValues: {
            ':md5': {
              S: previousMd5 ?? ' ',
            },
          },
          ConditionExpression: `attribute_not_exists(#md5) OR (#md5 = :md5)`,
          Item: {
            [mappings.partitionKeyFieldName]: {
              S: this.partitionKey(key),
            },
            [mappings.sortKeyFieldName]: {
              [mappings.sortKeyFieldAWSType]: sortKey,
            },
            [mappings.dataFieldName]: {
              S: JSON.stringify(data),
            },
            [mappings.md5]: {
              S: consistentMd5(data),
            },
          },
        })
        .promise()
        .catch(awsRethrow(`Partition: ${key.partition}, Sort: ${sortKey}, Previous MD5: ${previousMd5}`));
    } catch (e) {
      if (hasAWSErrorCode(e) && e.code === 'ConditionalCheckFailedException') {
        return false;
      }

      throw e;
    }

    return true;
  }

  private async existsRaw<T, P extends string>(key: CompoundKey<P, T>): Promise<boolean> {
    try {
      const sortKey = this.sortKey(key);

      const mappings = this.mappings();

      const result = await this.dynamo
        .getItem({
          TableName: this.tableName,
          Key: {
            [mappings.sortKeyFieldName]: {
              [mappings.sortKeyFieldAWSType]: sortKey,
            },
            [mappings.partitionKeyFieldName]: {
              S: this.partitionKey(key),
            },
          },
        })
        .promise()
        .catch(awsRethrow(`Partition: ${key.partition}, Sort: ${sortKey}`));

      return notNullOrUndefined(result.Item);
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return false;
      }

      throw e;
    }
  }

  private async setRawBatch<T, P extends string>(key: Array<{ key: CompoundKey<P, T>; data: T }>): Promise<void> {
    const mappings = this.mappings();

    for (const chunk of Arrays.grouped(key, 25)) {
      await this.dynamo
        .batchWriteItem({
          RequestItems: {
            [this.tableName]: chunk.map(item => ({
              PutRequest: {
                Item: {
                  [mappings.partitionKeyFieldName]: {
                    S: this.partitionKey(item.key),
                  },
                  [mappings.sortKeyFieldName]: {
                    [mappings.sortKeyFieldAWSType]: this.sortKey(item.key),
                  },
                  [mappings.dataFieldName]: {
                    S: JSON.stringify(item.data),
                  },
                },
              },
            })),
          },
        })
        .promise()
        .catch(awsRethrow());
    }
  }

  private async setRawAtomic<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void> {
    const sortKey = this.sortKey(key);

    const mappings = this.mappings();

    await this.dynamo
      .putItem({
        TableName: this.tableName,
        ExpressionAttributeNames: {
          '#key': mappings.partitionKeyFieldName,
          '#sort': mappings.sortKeyFieldName,
        },
        ExpressionAttributeValues: {
          ':key': {
            S: this.partitionKey(key),
          },
          ':sort': {
            [mappings.sortKeyFieldAWSType]: sortKey,
          },
        },
        ConditionExpression: `attribute_not_exists(#key) OR (#sort <> :sort AND #key <> :key)`,
        Item: {
          [mappings.partitionKeyFieldName]: {
            S: this.partitionKey(key),
          },
          [mappings.sortKeyFieldName]: {
            [mappings.sortKeyFieldAWSType]: sortKey,
          },
          [mappings.dataFieldName]: {
            S: JSON.stringify(data),
          },
        },
      })
      .promise()
      .catch(awsRethrow(`Partition: ${key.partition}, Sort: ${sortKey}`));
  }

  private async deleteSortKey<P extends string>(key: CompoundKey<P>): Promise<void> {
    const sortKey = this.sortKey(key);

    const mappings = this.mappings();

    await this.dynamo
      .deleteItem({
        TableName: this.tableName,
        Key: {
          [mappings.partitionKeyFieldName]: {
            S: this.partitionKey(key),
          },
          [mappings.sortKeyFieldName]: {
            [mappings.sortKeyFieldAWSType]: sortKey,
          },
        },
      })
      .promise()
      .catch(awsRethrow(`Partition: ${key.partition}, Sort: ${sortKey}`));
  }

  private async deletePartition(partition: string): Promise<void> {
    const mappings = this.mappings();

    // have to read all the keys and delete them
    for await (const items of this.listAll(partition)) {
      for (const chunk of Arrays.grouped(items, 25)) {
        await this.dynamo
          .batchWriteItem({
            RequestItems: {
              [this.tableName]: chunk.map(item => ({
                DeleteRequest: {
                  Key: {
                    [mappings.partitionKeyFieldName]: {
                      S: partition,
                    },
                    [mappings.sortKeyFieldName]: {
                      [mappings.sortKeyFieldAWSType]: item.key,
                    },
                  },
                },
              })),
            },
          })
          .promise()
          .catch(awsRethrow());
      }
    }
  }
}
