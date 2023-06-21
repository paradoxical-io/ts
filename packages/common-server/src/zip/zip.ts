import * as archiver from 'archiver';
import fs from 'fs';
import stream from 'stream';
import * as unzipper from 'unzipper';
import { ZlibOptions } from 'zlib';

export interface ZipEntry {
  path: string;
  data: stream.Readable;
}

/**
 * Creates a zip archive
 * @param entries
 * @param zlibOptions
 * @param output
 * @param zlibOptions.level
 * @returns Promise for a Readable representing zip archive
 *
 * `level` refers to compression level, from 0 to 9, 0 being uncompressed, 9 being most compressed (at cost of speed)
 * https://nodejs.org/api/zlib.html#class-options
 */
export async function createZip(
  entries: ZipEntry[],
  output: stream.Writable,
  zlibOptions: ZlibOptions = { level: 6 }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const archive = archiver.create('zip', {
      zlib: zlibOptions,
    });

    archive.pipe(output);

    entries.forEach(e => {
      archive.append(e.data, { name: e.path });
    });

    archive.on('close', resolve);
    archive.on('finish', resolve);

    archive.finalize().catch(reject);
  });
}

/**
 * Unzips a file or a stream
 * @param file
 * @param target
 */
export async function unzip(file: string | stream.Readable, target: string): Promise<void> {
  await new Promise<void>(r => {
    (typeof file === 'string' ? fs.createReadStream(file) : file)
      .pipe(unzipper.Extract({ path: target }))
      .on('close', () => {
        r();
      });
  });
}
