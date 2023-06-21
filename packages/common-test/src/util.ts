import fs from 'fs';
import path from 'path';

/**
 * Loads a JSON file from the __test__ folder at the cwd
 * @param file
 * @param root
 */
export function loadTestFile<T>(file: string, root = process.cwd()): T {
  const data = fs.readFileSync(path.join(root, '__test__', file));

  return JSON.parse(data.toString()) as T;
}
