import { Brand } from '@paradox/types';
import { stringify } from 'csv';
import stream from 'stream';

import { TypedReadable, TypedTransformable } from '../extensions';

export interface StreamableOptions {
  dateToISO?: boolean;
}

export async function toCsv<T>(
  data: T[],
  headers?: { [k in keyof T]: string },
  opts: StreamableOptions = { dateToISO: true }
): Promise<string> {
  return new Promise((resolve, reject) => {
    stringify(
      data,
      {
        header: true,
        columns: headers,
        cast: {
          date: opts.dateToISO ? d => d.toISOString() : undefined,
        },
      },
      (err, csv) => {
        if (err) {
          reject(err);
        } else {
          resolve(csv);
        }
      }
    );
  });
}

/**
 * A pipeable stream to create data
 * @param headers
 * @param opts
 */
export function toCsvStream<T>(
  headers?: { [k in keyof T]: string },
  opts: StreamableOptions = { dateToISO: true }
): stream.Transform {
  return stringify({
    header: true,
    columns: headers,
    objectMode: true,
    cast: {
      date: opts.dateToISO ? d => d.toISOString() : undefined,
    },
  });
}

export type CsvLine = Brand<string, 'CsvLine'>;

export class CsvStreamWriter<T> {
  private readonly stream: TypedTransformable<T>;

  constructor(headers?: { [k in keyof T]: string }, opts: StreamableOptions = { dateToISO: true }) {
    this.stream = toCsvStream(headers, opts);
  }

  output(): TypedReadable<CsvLine, T> {
    return this.stream;
  }

  push(data: T): void {
    this.stream.write(data);
  }

  close(): void {
    this.stream.end();
  }

  error(e: Error): void {
    this.stream.emit('error', e);
  }
}
