import { ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { attribute, hashKey } from '@aws/dynamodb-data-mapper-annotations';
import { Arrays, propertyOf } from '@paradoxical-io/common';
import { Brand, notNullOrUndefined } from '@paradoxical-io/types';
import AWS from 'aws-sdk';

import { awsRethrow } from '../../errors';
import { DynamoDao } from '../mapper';
import { assertTableNameValid, DynamoTableName, dynamoTableName } from '../util';

type KeyValueNamespace = Brand<string, 'Namespace'>;

export class KeyValueCountTableDao implements DynamoDao {
  @hashKey()
  key!: KeyValueNamespace;

  @attribute()
  count!: number;
}

export interface KeyCount<K extends string = string> {
  id: K;
  count?: number;
}

export class KeyValueScopedCounter<K extends string> {
  constructor(private key: (d: K) => string, private counter: KeyValueCounter) {}

  async reset(key: K): Promise<void> {
    await this.counter.delete(this.key(key));
  }

  async get(ids: K[]): Promise<Array<KeyCount<K>>> {
    if (ids.length === 0) {
      return [];
    }

    // a map of db key to logical key
    const keyMap = new Map<string, K>();

    ids.forEach(i => keyMap.set(this.key(i), i));

    const result = await this.counter.get(Array.from(keyMap.keys()));

    // reverse map the keys so we get back the logical key vs the physical key
    result.forEach(i => {
      i.id = keyMap.get(i.id)!;
    });

    return result as Array<KeyCount<K>>;
  }

  async current(key: K): Promise<number> {
    const id = this.key(key);
    const [result] = await this.counter.get([id]);

    return notNullOrUndefined(result?.count) ? result.count : 0;
  }

  async inc(key: K, by = 1): Promise<number> {
    return this.counter.incr(this.key(key), by);
  }

  async decr(key: K): Promise<number> {
    return this.counter.decr(this.key(key), 1);
  }
}

/**
 * An atomic key value counter
 */
export class KeyValueCounter {
  private readonly dynamo: AWS.DynamoDB;

  private readonly namespace: string;

  private readonly tableName: string;

  constructor({
    namespace,
    dynamo = new AWS.DynamoDB(),
    tableName = dynamoTableName('keys'),
  }: {
    namespace: string;
    dynamo?: AWS.DynamoDB;
    tableName?: DynamoTableName;
  }) {
    assertTableNameValid(tableName);

    this.namespace = namespace;

    this.tableName = tableName;

    this.dynamo = dynamo;
  }

  async get<K extends string = string>(ids: K[]): Promise<Array<KeyCount<K>>> {
    try {
      // a map of db key to logical key
      const keyMap = new Map<string, K>();

      ids.forEach(i => keyMap.set(this.key(i), i));

      const results = await this.getRaw<K>(ids.map(i => this.key(i)));

      // reverse map the keys so we get back the logical key vs the physical key
      results.forEach(i => {
        i.id = keyMap.get(i.id)!;
      });

      // for ids that are unset, push them onto the list so there is a consistent response
      ids.forEach(i => {
        if (!results.find(r => r.id === i)) {
          results.push({ id: i, count: undefined });
        }
      });

      return results;
    } catch (e) {
      if ((e as ItemNotFoundException).name === 'ItemNotFoundException') {
        return [];
      }

      throw e;
    }
  }

  async incr<K extends string = string>(id: K, by = 1): Promise<number> {
    return this.incrRaw({
      key: this.key(id),
      count: by,
    });
  }

  async decr<K extends string = string>(id: K, by = 1): Promise<number> {
    return this.incr(id, by * -1);
  }

  async delete<K extends string = string>(id: K): Promise<void> {
    await this.deleteRaw(this.key(id));
  }

  private key<K extends string = string>(id: K): KeyValueNamespace {
    if (this.namespace.length > 0) {
      return `${this.namespace}.${id}` as KeyValueNamespace;
    }

    return id.toString() as KeyValueNamespace;
  }

  private async getRaw<K extends string = string>(id: KeyValueNamespace[]): Promise<Array<KeyCount<K>>> {
    if (id.length === 0) {
      return [];
    }

    const promises = Arrays.grouped(id, 100).map(async idGroup => {
      const result = await this.dynamo
        .batchGetItem({
          RequestItems: {
            [this.tableName]: {
              Keys: idGroup.map(key => ({
                [propertyOf<KeyValueCountTableDao>('key')]: {
                  S: key,
                },
              })),
            },
          },
        })
        .promise()
        .catch(awsRethrow());

      if (result?.Responses) {
        return result.Responses[this.tableName].map(result => {
          const item: KeyCount<K> = {
            id: result[propertyOf<KeyValueCountTableDao>('key')].S!.toString() as K,
            count: Number(result[propertyOf<KeyValueCountTableDao>('count')]?.N ?? 0),
          };

          return item;
        });
      }

      return [];
    });

    const results = await Promise.all(promises);

    return results.flatMap(i => i);
  }

  private async incrRaw(data: KeyValueCountTableDao): Promise<number> {
    const result = await this.dynamo
      .updateItem({
        TableName: this.tableName,
        Key: {
          [propertyOf<KeyValueCountTableDao>('key')]: {
            S: data.key,
          },
        },
        UpdateExpression: 'add #count :value',
        ExpressionAttributeNames: {
          '#count': propertyOf<KeyValueCountTableDao>('count'),
        },
        ExpressionAttributeValues: {
          ':value': {
            N: data.count.toString(),
          },
        },
        ReturnValues: 'UPDATED_NEW',
      })
      .promise()
      .catch(awsRethrow(data.key));

    return Number(result.Attributes![propertyOf<KeyValueCountTableDao>('count')].N);
  }

  private async deleteRaw(id: KeyValueNamespace): Promise<void> {
    await this.dynamo
      .deleteItem({
        TableName: this.tableName,
        Key: {
          [propertyOf<KeyValueCountTableDao>('key')]: {
            S: id,
          },
        },
      })
      .promise()
      .catch(awsRethrow(id));
  }
}
