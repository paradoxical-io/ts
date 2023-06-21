// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const child_process = require('child_process');
const path = require('path');

// ensure all tests run in utc timezone
process.env.TZ = 'UTC';
process.env.PARADOX_ENV = 'local';
process.env.PARADOX_CONFIG_PATH = 'config';
process.env.JEST_TEST = 'true';
process.env.PARADOX_SKIP_LOG_DECORATORS = 'true';

function getGitRoot() {
  return child_process
    .execSync(`git rev-parse --show-toplevel`, {
      encoding: 'utf-8',
    })
    .trim();
}

function getProjectName() {
  return require(`${process.cwd()}/package.json`).name.replace('@', '').replace('/', '_');
}

const CI_DATA = process.env.CI
  ? {
      root: getGitRoot(),
      name: getProjectName(),
    }
  : {};

module.exports = {
  cacheDirectory: `${CI_DATA.root ?? '.'}/.jest-cache`,

  preset: process.env.CI ? undefined : 'ts-jest',

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Use this configuration option to add custom reporters to Jest
  reporters: process.env.CI
    ? [
        'default',
        `${CI_DATA.root}/packages/common-test/dist/jest/reporter.js`,
        [
          'jest-junit',
          {
            outputDirectory: `${CI_DATA.root}/reports/tests`,
            outputName: `${CI_DATA.name}_tests.xml`,
            usePathForSuiteName: 'true',
          },
        ],
      ]
    : undefined,

  // Automatically reset mock state between every test
  resetMocks: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: [process.cwd() + (process.env.CI ? '/dist' : '/src')],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // find snapshots co-located to ts files vs the dist files
  // https://brunoscheufler.com/blog/2020-03-08-configuring-jest-snapshot-resolvers
  snapshotResolver: process.env.CI ? `${CI_DATA.root}/packages/common-test/dist/jest/snapshotResolver.js` : undefined,

  // Whether to use watchman for file crawling
  // watchman: true,
  globals: {
    'ts-jest': {
      // https://github.com/kulshekhar/ts-jest/issues/259#issuecomment-504088010
      maxWorkers: 1,
      diagnostics: false,
    },
  },

  // common ignore patterns used by /app & /app/e2e
  transformIgnorePatterns: [
    `node_modules/(?!(jest-)?react-native|@react-native|react-navigation-redux-helpers|@react-navigation/.*|@react-native-community/.*|expo-modules-core|sentry-expo|native-base|expo(nent)?|@expo(nent)?|@react-native-picker/.*/.*)`,
  ],
};
