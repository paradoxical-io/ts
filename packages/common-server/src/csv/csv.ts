import csv from 'csv-parser';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
// eslint-disable-next-line no-restricted-imports
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';
import * as fs from 'fs';

export interface CsvWriteHeader<T> {
  id: keyof T & string;
  title: string;
}

/**
 * Typed CSV wrapper class
 *
 * @deprecated use {@link toCsv}
 */
export class Csv<T> {
  private writer: CsvWriter<T>;

  /**
   * Pass in the header. id is the field of T to extract
   * @param path
   * @param header
   */
  constructor(path: string, header: Array<CsvWriteHeader<T>> | Array<keyof T & string>) {
    let title: Array<CsvWriteHeader<T>>;
    if (typeof header[0] === 'object') {
      title = header as Array<CsvWriteHeader<T>>;
    } else {
      title = header.map(i => ({ id: i, title: i } as CsvWriteHeader<T>));
    }

    // @ts-ignore
    this.writer = createCsvWriter({
      path,
      header: title,
    });
  }

  /**
   * Iterates all the values and creates a set of headers from the found keys in the csv
   * @param items
   */
  static headersFromObjects<T extends object>(items: T[]): Array<CsvWriteHeader<T>> {
    const keySet: Set<string> = new Set();

    items.forEach(item => Object.keys(item).forEach(key => keySet.add(key)));

    return Array.from(keySet.values()).map(key => ({ id: key, title: key } as CsvWriteHeader<T>));
  }

  async write(data: T[]) {
    await this.writer.writeRecords(data);
  }
}

/**
 * If both types of T, Y are the same, return the first. Otherwise return the second
 */
type CsvReadableType<T, Y> = T extends Y ? T : Y;

export class CsvReader<T> {
  /**
   * Read from the path. If keys are specified ALL keys that are in the file must exist.
   *
   * If no keys are provided a header in the csv must exist and the object will be built
   * using the header.
   *
   * Easiest thing to do is just read from the path and type T as what the existing header is.
   *
   * @param path The file path to read from
   * @param keys The name of each column, ordered. If not provided the first objects keys will be used, All columns must be accounted for
   * @param skipHeader Whether to skip the first line. If a header exist AND you specify specific keys this must be true.
   * @param mapper How to map the structured set of values which are all strings to a specific type
   */
  async read<Y = Record<keyof T, string>, Z = CsvReadableType<T, Y>>(
    path: string | NodeJS.ReadableStream,
    {
      keys,
      skipHeader = true,
      mapper,
    }: {
      keys?: Array<keyof T>;
      skipHeader?: boolean;
      mapper?: (data: Record<keyof T, string>) => Z;
    } = {}
  ): Promise<Z[]> {
    const results: Z[] = [];

    const config =
      keys !== undefined
        ? csv({
            headers: keys as string[],
            skipLines: skipHeader ? 1 : 0,
          })
        : csv();

    const stream = typeof path === 'string' ? fs.createReadStream(path) : path;
    return new Promise(r => {
      stream
        .pipe(config)
        .on('data', data => results.push(mapper ? mapper(data) : (data as Z)))
        .on('end', () => {
          r(results);
        });
    });
  }
}
