import { Streams } from '@paradoxical-io/common';
import { CompoundKey, notNullOrUndefined } from '@paradoxical-io/types';

import { KeyValueList, KeyValueTable } from '../keyTable';
import { KeyCount, KeyValueCounter } from '../keyValueCounter';
import { PartitionedKeys } from '../partitionedKeys';
import { PartitionedKeyValueTable } from '../partitionedKeyTable';
import { PartitionedKeyValueCounter } from '../partitionedKeyValueCounter';

/**
 * An in memory kv table that uses a map. Used for testing and stubbing
 */
export class InMemoryKvTable extends KeyValueTable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly store = new Map<string, string>();

  constructor() {
    super({ namespace: '' });
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async get<T>(id: string): Promise<T | undefined> {
    const d = this.store.get(id);
    if (d !== undefined) {
      return JSON.parse(d) as T;
    }

    return undefined;
  }

  async getBatch<T>(id: string[]): Promise<T[]> {
    return [...this.store.entries()].filter(([key]) => id.includes(key)).map(i => JSON.parse(i[1]) as T);
  }

  async listAll<K, V>(): Promise<KeyValueList<[K, V]> | undefined> {
    // @ts-ignore
    const items: Array<[K, V]> = [...this.store.entries()];

    return { items };
  }

  async set<T>(id: string, data: T): Promise<void> {
    this.store.set(id, JSON.stringify(data));
  }
}

export class InMemoryPartitionedKvTable extends PartitionedKeyValueTable {
  private kvTable: InMemoryKvTable;

  constructor() {
    super({});
    this.kvTable = new InMemoryKvTable();
  }

  async clear<P extends string>(partition: P): Promise<void> {
    const all = await Streams.from(this.listAll(partition));

    await Promise.all(all.flatMap(i => i).map(k => this.kvTable.delete(k.key)));
  }

  async delete<P extends string>(key: CompoundKey<P, unknown>): Promise<void> {
    return this.kvTable.delete(this.key(key));
  }

  async exists<T, P extends string>(key: CompoundKey<P, T>): Promise<boolean> {
    const value = await this.get(key);

    return notNullOrUndefined(value);
  }

  async get<T, P extends string>(key: CompoundKey<P, T>): Promise<T | undefined> {
    return this.kvTable.get(this.key(key));
  }

  protected async getRaw<T, P extends string>(key: CompoundKey<P, T>): Promise<{ data: T; md5?: string } | undefined> {
    return {
      data: (await this.get(key)) as T,
    };
  }

  async *listAll(partition: string): AsyncGenerator<Array<{ key: string; value: string }>> {
    const all = await this.kvTable.listAll<string, string>();

    const keys = (all?.items?.filter(i => i[0].startsWith(partition)) ?? []).map(([k, v]) => ({ key: k, value: v }));

    yield keys;
  }

  async set<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void> {
    return this.kvTable.set(this.key(key), data);
  }

  async setIfNotExists<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<boolean> {
    if (await this.get(key)) {
      return false;
    }

    await this.set(key, data);

    return true;
  }

  protected async setIfMd5Matches<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<boolean> {
    await this.set(key, data);

    return true;
  }

  private key<P extends string>(key: CompoundKey<P, unknown>): string {
    return `${key.partition}.${key.namespace}.${key.sort}`;
  }
}

/**
 * An in memory key count table that uses a map. Used for testing and stubbing
 */
export class InMemoryPartitionedKeyCountTable extends PartitionedKeyValueCounter {
  private readonly store = new InMemoryPartitionedKvTable();

  constructor() {
    super({});
  }

  async delete<P extends string = string>(id: CompoundKey<P, number>): Promise<void> {
    return this.store.delete(id);
  }

  async get<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined> {
    return this.store.get(id);
  }

  async incr<P extends string = string>(id: CompoundKey<P, number>, by = 1): Promise<number> {
    await this.store.set(id, ((await this.store.get(id)) ?? 0) + by);

    return (await this.store.get(id))!;
  }
}

export class InMemoryPartitionedKeys extends PartitionedKeys {
  constructor() {
    super(new InMemoryPartitionedKvTable(), new InMemoryPartitionedKeyCountTable());
  }
}

/**
 * An in memory key count table that uses a map. Used for testing and stubbing
 */
export class InMemoryKeyCountTable extends KeyValueCounter {
  private readonly store = new Map<string, number>();

  constructor() {
    super({ namespace: '' });
  }

  async delete<K extends string = string>(id: K): Promise<void> {
    this.store.delete(id);
  }

  async get<K extends string = string>(ids: K[]): Promise<Array<KeyCount<K>>> {
    return ids.map(i => ({
      id: i,
      count: this.store.get(i),
    }));
  }

  async incr<K extends string = string>(id: K, by = 1): Promise<number> {
    this.store.set(id, (this.store.get(id) ?? 0) + by);

    return this.store.get(id)!;
  }
}
