import { Limiter } from '@paradox/common/dist/promise/limiter';

import { ReloadableProvidedValue } from '.';

type Resolved<T> = T extends () => Promise<infer U> ? U : T;

type Primitive = string | number | boolean | ReloadableProvidedValue | null | undefined;

type MappedResolved<T> = T extends Primitive ? T : { [k in keyof T]: MappedResolved<Resolved<T[k]>> };

function autoResolveInternal<T extends object>(
  data: T,
  limiter: Limiter,
  promises: Array<Promise<void>>
): MappedResolved<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: { [k: string]: any } = {};

  Object.entries(data).forEach(([k, v]) => {
    if (typeof v === 'function') {
      promises.push(
        limiter.wrap(v as () => Promise<void>).then(data => {
          result[k] = data;
        })
      );
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      result[k] = autoResolveInternal(v, limiter, promises);
    } else {
      result[k] = v;
    }
  });

  return result as MappedResolved<T>;
}

/**
 * Given an object that looks kind of like
 *
 * {@code
 *
 *  {
 *    foo: 1,
 *    bar: () => Promise<number>(...)
 *  }
 *
 *
 * }
 *
 * Allows you to resolve all lambda promises using a queued limiter.  This can be useful if you have to populate
 * many promises for an object and don't want to have to separate the assignment from the query.
 *
 * Recursively goes through the object, evaluates the lambda, and waits for all promises in parallel using a limiter
 * @param data
 * @param limiter
 */
export async function autoResolve<T extends object>(
  data: T,
  limiter: Limiter = new Limiter()
): Promise<MappedResolved<T>> {
  const queuedPromises: Array<Promise<void>> = [];

  const result = autoResolveInternal(data, limiter, queuedPromises);

  await Promise.all(queuedPromises);

  return result;
}
