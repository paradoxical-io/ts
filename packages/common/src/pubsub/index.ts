type Types<Obj> = Obj extends { type: infer Key } ? (Key extends string ? Key : never) : never;

type ByType<Obj, Key extends string> = Key extends Types<Obj> ? (Obj extends { type: Key } ? Obj : never) : never;

/**
 * Generic in memory publisher of subscribe-able actions. The events all must have a 'type' field that is string based
 */
export class PubSub<T extends { type: Types<T> }, Keys extends string = Types<T>> {
  protected callbacks = new Map<Keys, Array<(data: T) => void | Promise<void>>>();

  /**
   * Waits on all consumers to finish.
   * @param event
   * @param onError if set, proxies errors to this and nothing is thrown
   */
  async publish(event: T, onError?: (e: unknown) => void): Promise<void> {
    await Promise.all(
      this.callbacks.get(event.type as Keys)?.map(async callback => {
        try {
          const result = callback(event);

          if (result instanceof Promise) {
            if (onError) {
              await result.catch(onError);
            } else {
              await result;
            }
          }
        } catch (e) {
          if (onError) {
            onError(e);
          } else {
            throw e;
          }
        }
      }) ?? []
    );
  }

  /**
   * Subscribe to an event
   * @param key the type of event to subscribe to
   * @param onEvent  A callback with that type of event
   */
  subscribe<Key extends Types<T>>(key: Key, onEvent: (data: ByType<T, Key>) => void) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }

    if (this.callbacks.has(key)) {
      this.callbacks.get(key)!.push(onEvent as (data: T) => void);
    }
  }
}
