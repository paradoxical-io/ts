import { attribute, hashKey } from '@aws/dynamodb-data-mapper-annotations';
import {
  BatchGetItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { Arrays, propertyOf } from '@paradoxical-io/common';
import { Brand, notNullOrUndefined } from '@paradoxical-io/types';
import { log } from '@paradoxical-io/common-server';

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

    return notNullOrUndefined(result) && notNullOrUndefined(result?.count) ? result.count : 0;
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
  private readonly dynamo: DynamoDBClient;

  private readonly namespace: string;

  private readonly tableName: string;

  constructor({
                namespace,
                dynamo = new DynamoDBClient(),
                tableName = dynamoTableName('keys'),
              }: {
    namespace: string;
    dynamo?: DynamoDBClient;
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
      if (e instanceof ResourceNotFoundException) {
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
      const command = new BatchGetItemCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: idGroup.map(key => ({
              [propertyOf<KeyValueCountTableDao>('key')]: {
                S: key,
              },
            })),
          },
        },
      });

      const result = await this.dynamo.send(command);

      if (result?.Responses) {
        return result.Responses[this.tableName]!.map(result => {
          const item: KeyCount<K> = {
            id: result[propertyOf<KeyValueCountTableDao>('key')]!.S!.toString() as K,
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
    const command = new UpdateItemCommand({
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
    });

    try {
      const result = await this.dynamo.send(command);

      return Number(result.Attributes![propertyOf<KeyValueCountTableDao>('count')]!.N);
    } catch (e) {
      log.error(`Failed to increment ${data.key}`, e);

      throw e;
    }
  }

  private async deleteRaw(id: KeyValueNamespace): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        [propertyOf<KeyValueCountTableDao>('key')]: {
          S: id,
        },
      },
    });

    try {
      await this.dynamo.send(command);
    } catch (e) {
      log.error(`Failed to delete ${id}`, e);

      throw e;
    }
  }
}
