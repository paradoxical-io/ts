import { defaultTimeProvider, isExpired, TimeProvider } from '@paradoxical-io/common';
import { EpochMS } from '@paradoxical-io/types';

import { Lock, LockApi } from '../locking';

export class InMemoryLock implements LockApi {
  private locks: Map<string, { acquiredAt: EpochMS; timeoutSeconds: number }>;

  constructor(private timeProvider: TimeProvider = defaultTimeProvider()) {
    this.locks = new Map<string, { acquiredAt: EpochMS; timeoutSeconds: number }>();
  }

  async tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined> {
    const existing = this.locks.get(key);
    const now = this.timeProvider.epochMS();

    if (existing) {
      if (isExpired(existing.acquiredAt, existing.timeoutSeconds, 'seconds', this.timeProvider)) {
        this.locks.delete(key);
      } else {
        return undefined;
      }
    }

    this.locks.set(key, { acquiredAt: now, timeoutSeconds });

    return {
      type: 'lock',
      release: async () => {
        this.locks.delete(key);
      },
    };
  }
}
