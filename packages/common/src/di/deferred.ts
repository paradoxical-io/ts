export interface DeferredReader<T> {
  get(): T;
}

class CycleManager {
  private readonly deferrals: Array<{ name: string; dependency: Deferred<unknown> }> = [];

  newDeferral<T>(name: string): Deferred<T> {
    const d = new Deferred<T>();

    this.deferrals.push({ name, dependency: d });

    return d;
  }

  verify() {
    const unfullfilled = this.deferrals.filter(i => {
      try {
        i.dependency.get();
      } catch (e) {
        return true;
      }

      return false;
    });

    if (unfullfilled.length > 0) {
      throw new Error(`Unfulfilled dependencies exist: ${unfullfilled.map(i => i.name)}`);
    }
  }
}

/**
 * Wraps a dependency block with a cycle manager and auto verifies that all cycles are properly satisfied
 * @param builder
 */
export function withCycles<T>(builder: (manager: CycleManager) => T) {
  const manager = new CycleManager();

  const result = builder(manager);

  manager.verify();

  return result;
}

/**
 * Wrap a static value into a deferred
 * @param data
 */
export function staticDeferred<T>(data: T): DeferredReader<T> {
  const reader = new Deferred<T>();

  reader.set(data);

  return reader;
}

/**
 * Defer a dependency. This can be used to break cycles between objects and to be used
 * sparingly. It is much better to refactor the code to remove the cycles than to leverage this
 * as you introduce the possibility of leaving a deferment incomplete
 */
class Deferred<T> implements DeferredReader<T> {
  private data: T | undefined;

  get(): T {
    if (this.data) {
      return this.data;
    }

    throw new Error('Dependency not resolved!');
  }

  set(d: T) {
    if (this.data) {
      throw new Error('Dependency already resolved');
    }

    this.data = d;
  }
}
