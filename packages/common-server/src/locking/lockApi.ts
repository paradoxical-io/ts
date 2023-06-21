export interface LockApi {
  tryAcquire(key: string, timeoutSeconds: number): Promise<Lock | undefined>;
}

export interface Lock {
  type: 'lock';
  release(): Promise<void>;
}

export class NoOpLock implements LockApi {
  constructor(private locked = false) {}

  async tryAcquire(): Promise<Lock | undefined> {
    if (this.locked) {
      return undefined;
    }

    return {
      type: 'lock',
      release: () => Promise.resolve(),
    };
  }
}
