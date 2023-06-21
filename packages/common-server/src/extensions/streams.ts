import stream from 'stream';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TypedReadable<T, Y = unknown> = stream.Readable & { push(data: T): void };

export type TypedTransformable<T> = stream.Transform & { write(data: T): void };

export class Streams {
  /**
   * Reads a byte stream into a buffer
   * @param readStream
   */
  static toBuffer(readStream: stream.Readable): Promise<Buffer> {
    const b: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
      readStream.on('data', chunk => {
        b.push(chunk);
      });
      readStream.on('error', reject);
      readStream.on('end', () => {
        resolve(Buffer.concat(b));
      });
    });
  }

  /**
   * Reads a  stream into an array of elements
   * @param readStream
   */
  static toArray<T>(readStream: TypedReadable<T>): Promise<T[]> {
    const b: T[] = [];

    return new Promise((resolve, reject) => {
      readStream.on('data', chunk => {
        b.push(chunk);
      });
      readStream.on('error', reject);
      readStream.on('end', () => {
        resolve(b);
      });
      readStream.on('close', () => {
        resolve(b);
      });
    });
  }

  /**
   * Creates an async iterator from a pageable promise. This can be used to transform any DB pageable call
   * into an infinite stream consumable in a while loop
   *
   * @param start The start page
   * @param next Takes a page and returns a response.
   * @param extract How to extract the response. It should return [NextPage, Results[]]. If returns undefined, the iterator will end
   */
  static async *pagingAsyncIterator<Page, Result, Response>(
    start: Page,
    next: (page: Page) => Promise<Response | undefined>,
    extract: (resp: Response) => [Page, Result[]] | undefined
  ): AsyncGenerator<Result> {
    let page = start;
    while (true) {
      const resp = await next(page);

      if (resp) {
        const extracted = extract(resp);

        if (!extracted) {
          return;
        }

        const [next, results] = extracted;

        for (const r of results) {
          yield r;
        }
        page = next;
      } else {
        return;
      }
    }
  }

  /**
   * Group any async stream into chunks
   * @param iterator
   * @param size
   */
  static async *grouped<T>(iterator: AsyncGenerator<T>, size: number): AsyncGenerator<T[]> {
    let group: T[] = [];

    for await (const item of iterator) {
      group.push(item);

      if (group.length >= size) {
        yield group;
        group = [];
      }
    }

    yield group;
  }

  /**
   * Take N values from the async iterator and return a new async iterator
   * @param iterator
   * @param size
   */
  static async *takeAsync<T>(iterator: AsyncGenerator<T>, size: number): AsyncGenerator<T> {
    let count = 0;
    for await (const item of iterator) {
      if (count < size) {
        yield item;
        count++;
      } else {
        break;
      }
    }
  }

  /**
   * Take N values from the sync iterator and return a new sync iterator
   * @param iterator
   * @param size
   */
  static *take<T>(iterator: Generator<T>, size: number): Generator<T> {
    let count = 0;

    for (const item of this.takeWhile(iterator, () => {
      count++;
      return count <= size;
    })) {
      yield item;
    }
  }

  /**
   * Take N values from the sync iterator and return a new sync iterator
   * @param iterator
   * @param predicate
   */
  static *takeWhile<T>(iterator: Generator<T>, predicate: (d: T) => boolean): Generator<T> {
    for (const item of iterator) {
      if (predicate(item)) {
        yield item;
      } else {
        break;
      }
    }
  }

  /**
   * Drop N values from the sync iterator and return a new sync iterator
   * @param iterator
   * @param predicate
   */
  static *dropWhile<T>(iterator: Generator<T>, predicate: (d: T) => boolean): Generator<T> {
    for (const item of iterator) {
      if (predicate(item)) {
        // drop
      } else {
        yield item;
      }
    }
  }

  /**
   * Map an async stream
   * @param iterator
   * @param mapper
   */
  static async *map<T, Y>(iterator: AsyncGenerator<T>, mapper: (data: T) => Y): AsyncGenerator<Y> {
    for await (const item of iterator) {
      yield mapper(item);
    }
  }

  /**
   * Map an async stream
   * @param iterator
   * @param mapper
   */
  static async *mapAsync<T, Y>(iterator: AsyncGenerator<T>, mapper: (data: T) => Promise<Y>): AsyncGenerator<Y> {
    for await (const item of iterator) {
      yield await mapper(item);
    }
  }

  /**
   * Await and read an async generator to completion
   * @param iterator
   */
  static async from<T>(iterator: AsyncGenerator<T>): Promise<T[]> {
    const l: T[] = [];

    for await (const val of iterator) {
      l.push(val);
    }

    return l;
  }
}
