import path from 'path';

/**
 * Allows us to resolve snapshots stored in the /src/ dir when running tests from the /dist dir
 */

/**
 * resolves from test to snapshot path
 * @param snapshotFile
 */
function resolveSnapshotPath(testFile: string, ext: string) {
  // Get directory of test source file
  const snapshotDir = path.dirname(testFile).replace('dist/', 'src/');

  // Get file name of test source file
  const snapshotFile = path.basename(testFile).replace('.js', '.ts');

  return `${snapshotDir}/__snapshots__/${snapshotFile}${ext}`;
}

/**
 * resolves from snapshot to test path
 * @param snapshotFile
 * @param ext
 */
function resolveTestPath(snapshotFile: string, ext: string): string {
  const testDirectory = path.dirname(snapshotFile).replace('src/', 'dist/').replace('__snapshots__', '');

  const testFilename = path.basename(snapshotFile).replace('.ts', '.js').slice(0, -ext.length);

  return path.join(testDirectory, testFilename);
}

const testPathForConsistencyCheck = 'dist/jest/jest.test.js';

module.exports = {
  resolveSnapshotPath,
  resolveTestPath,
  testPathForConsistencyCheck,
};
