import fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { gitRootSync } from '../process';

/**
 * Takes a relative or absolute path passed by the user to a command
 * and returns an absolute URL based on the pwd and passed value
 */
export function getAbsPath(absOrRelativePath: string): string {
  // ~ is not resolved by node, so check for it
  if (absOrRelativePath[0] === '~') {
    return process.env.HOME + absOrRelativePath.substr(1);
  }
  return path.resolve(process.cwd(), absOrRelativePath);
}

/**
 * Given a path relative to the repo base, return an absolute path
 * @param pathRelativeToBase A path relative to the repo base. For example, if the base is /src/base, passing 'foo'
 * will return /src/base/foo
 */
export function getAbsPathWithRepoBase(pathRelativeToBase: string) {
  return path.join(gitRootSync().trim(), pathRelativeToBase);
}

/**
 * Given a folder returns only directories (not files)
 * @param source
 */
export async function getDirectories(source: string): Promise<string[]> {
  const p = await util.promisify(fs.readdir)(source, { withFileTypes: true });

  return p.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
}

/**
 * Given a folder returns only files (not directories)
 * @param source
 */
export async function getFiles(source: string): Promise<string[]> {
  const p = await util.promisify(fs.readdir)(source, { withFileTypes: true });

  return p.filter(dirent => !dirent.isDirectory()).map(dirent => dirent.name);
}

export async function existsPath(location: string): Promise<boolean> {
  try {
    await util.promisify(fs.stat)(location);

    return true;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any).code === 'ENOENT') {
      return false;
    }

    throw e;
  }
}
