import { sleep } from '@paradox/common';
import { Milliseconds, notNullOrUndefined } from '@paradox/types';

import { KeyValueList, KeyValueTable } from './keyTable';

/**
 * Wrapper around key value storage that supports append/get for sets (reads the set before appending)
 *
 * @deprecated Use {@link PartitionedKeyValueTable} for all new keys
 */
export class KeySetValueTable<K, V extends NonNullable<unknown>> {
  constructor(
    /**
     * key: How to map K to a dynamo key name
     */
    private key: (k: K) => string,
    /**
     * kv: The wrapper kv table
     */
    private kv: KeyValueTable,
    /**
     * setIncluder: Determines how to determine if a value is in the set
     * @param v current set of values
     * @param t value to be added
     */
    private setIncluder: (values: V[], test: V) => boolean = (v, t) => v.includes(t)
  ) {}

  /**
   * Appends value to the set owned by key
   * @param key
   * @param value
   */
  async append(key: K, value: V) {
    const current = await this.get(key);
    const id = this.key(key);

    if (this.setIncluder(current, value)) {
      return;
    }

    current.push(value);

    await this.kv.set(
      id,
      current.filter(v => notNullOrUndefined(v))
    );
  }

  /**
   * Removes a value from the set owned by key.
   * @param key
   * @param value
   * @param deleteOnEmpty If set, and there are no values left after remove, deletes key. Otherwise sets key to an empty set
   */
  async remove(key: K, value: V, { deleteOnEmpty } = { deleteOnEmpty: false }) {
    const current = await this.get(key);
    const id = this.key(key);

    // if we don't already have this value just short ciruit
    if (!this.setIncluder(current, value)) {
      return;
    }

    const nextSetData = current.filter(i => i !== value);

    if (deleteOnEmpty && nextSetData.length === 0) {
      await this.kv.delete(id);
    } else {
      // rewrite the whole set with the value removed
      await this.kv.set(id, nextSetData);
    }
  }

  async exists(key: K) {
    const id = this.key(key);

    const existing = await this.kv.get(id);

    return existing !== undefined;
  }

  async get(key: K): Promise<V[]> {
    const id = this.key(key);
    return (await this.kv.get<V[]>(id)) ?? [];
  }

  async set(key: K, value: V[]) {
    const id = this.key(key);

    await this.kv.set(
      id,
      value.filter(v => notNullOrUndefined(v))
    );
  }

  async *streamAll(
    perPage: number,
    opts?: {
      minimumDelayBetween?: Milliseconds;
      keyContains?: string;
    }
  ): AsyncGenerator<[K, V[]]> {
    let result: KeyValueList<[K, V[]]> | undefined;
    do {
      const delayPromise = opts?.minimumDelayBetween ? sleep(opts?.minimumDelayBetween) : Promise.resolve();
      result = await this.kv.listAll<K, V[]>({
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
}
