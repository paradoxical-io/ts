import { CompoundKey } from '@paradox/types';
import AWS from 'aws-sdk';

import { DynamoTableName, dynamoTableName } from '../util';
import { PartitionedKeyValueTable } from './partitionedKeyTable';
import { PartitionedKeyValueCounter } from './partitionedKeyValueCounter';

export class PartitionedKeys {
  constructor(readonly keys: PartitionedKeyValueTable, readonly counters: PartitionedKeyValueCounter) {}

  static default({
    dynamo = new AWS.DynamoDB(),
    tableName = dynamoTableName('partitioned_keys'),
  }: {
    dynamo?: AWS.DynamoDB;
    tableName?: DynamoTableName;
  } = {}) {
    return new PartitionedKeys(
      new PartitionedKeyValueTable({ dynamo, tableName }),
      new PartitionedKeyValueCounter({ dynamo, tableName })
    );
  }

  async getValue<T, P extends string>(key: CompoundKey<P, T>): Promise<T | undefined> {
    return this.keys.get(key);
  }

  async setValue<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void> {
    return this.keys.set(key, data);
  }

  async delete<T, P extends string>(key: CompoundKey<P, T>): Promise<void> {
    return this.keys.delete(key);
  }

  /**
   * Atomically get a numeric value
   * @param id
   * @param by
   */
  async getCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined> {
    return this.counters.get(id);
  }

  /**
   * Atomically increment a value
   * @param id
   * @param by
   */
  async incrCounter<P extends string>(id: CompoundKey<P, number>, by?: number): Promise<number | undefined> {
    return this.counters.incr(id, by);
  }

  /**
   * Atomically decrement a value
   * @param id
   * @param by
   */
  async decrCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined> {
    return this.counters.decr(id);
  }
}
