import { defaultTimeProvider } from '@paradox/common';
import { logMethod } from '@paradox/common-server';
import { CompoundKey, DoOnceActionKey, DoOnceResponse, EpochMS, SortKey } from '@paradox/types';

import { PartitionedKeyValueTable } from '../keys';

export class DoOnceManager<Key extends string = string> {
  constructor(private readonly kv: PartitionedKeyValueTable, private readonly time = defaultTimeProvider()) {}

  /**
   * The key format where each action is stored separately in the KV.
   * @param userId
   * @param actionKey
   * @private
   */
  private static key<Key extends string = string>(
    userId: Key,
    actionKey: DoOnceActionKey
  ): CompoundKey<Key, EpochMS | string> {
    return {
      partition: userId,
      namespace: 'users',
      sort: `do_once.${actionKey}` as SortKey,
    };
  }

  /**
   * Wraps an action with a check on whether, or not, the user has done the action already.
   * @param userId
   * @param key
   * @param action
   * @note We aren't currently locking the key so if two requests come through for the same user and action in parallel
   *  there is a chance the action could be done more than once.
   */
  async doOnce<T>(userId: Key, key: DoOnceActionKey, action: () => Promise<T>): Promise<DoOnceResponse<T>> {
    const alreadyDone = await this.haveAlreadyDone(userId, key);

    if (alreadyDone) {
      return { didAction: false };
    }

    const response = await action();

    const doneAt = await this.markDone(userId, key);

    return {
      didAction: true,
      actionResponse: response,
      at: doneAt,
    };
  }

  /**
   * Returns whether of or not the user has already done the action
   * @param userId
   * @param key
   */
  async haveAlreadyDone(userId: Key, key: DoOnceActionKey): Promise<DoOnceResult | undefined> {
    // first check the new key format that does not depend on storing a set in Dynamo, which
    // isn't very thread safe
    const done = await this.kv.get(DoOnceManager.key(userId, key));

    if (done) {
      return {
        done: true,
        at: typeof done === 'number' ? (Number(done) as EpochMS) : undefined,
      };
    }

    return undefined;
  }

  /**
   * Marks a particular action for a user done
   * @param userId
   * @param key
   */
  @logMethod()
  async markDone(userId: Key, key: DoOnceActionKey): Promise<EpochMS> {
    const now = this.time.epochMS();

    await this.kv.setIfNotExists(DoOnceManager.key(userId, key), now);

    return now;
  }

  /**
   * Clears a particular key for a user
   * @param userId
   * @param key
   */
  @logMethod()
  async clearKey(userId: Key, key: DoOnceActionKey): Promise<void> {
    await this.kv.delete(DoOnceManager.key(userId, key));
  }
}

export interface DoOnceResult {
  done: true;
  at?: EpochMS;
}
