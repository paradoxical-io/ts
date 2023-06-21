import { asMilli, Expiring, expiring } from '@paradox/common';
import { CompoundKey, SortKey } from '@paradox/types';

import { PartitionedKeyValueTable } from '../../dynamo';
import { QueueName, QueueUrl } from '../consumer';

export interface ProxyQueueProvider {
  queues(src: QueueName): Promise<QueueUrl[] | undefined>;
}

export class DevProxyProvider implements ProxyQueueProvider {
  private lookup = new Map<QueueName, Expiring<Promise<QueueUrl[] | undefined>>>();

  constructor(private kv: PartitionedKeyValueTable) {}

  /**
   * Caches queue lookups
   * @param src
   */
  queues(src: QueueName): Promise<QueueUrl[] | undefined> {
    const exp = this.lookup.get(src);

    if (exp) {
      return exp.get();
    }

    const resolver = expiring(() => this.kv.get(this.key(src)), asMilli(30, 'seconds'));

    this.lookup.set(src, resolver);

    return resolver.get();
  }

  async register(url: QueueUrl, src: QueueName): Promise<void> {
    await this.kv.addToSet(this.key(src), url);
  }

  async remove(url: QueueUrl, src: QueueName): Promise<void> {
    await this.kv.removeFromSet(this.key(src), url);
  }

  private key(src: QueueName): CompoundKey<string, QueueUrl[]> {
    return {
      sort: src.toString() as SortKey,
      namespace: 'global',
      partition: 'aws.proxy.queue',
    };
  }
}
