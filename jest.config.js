// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const child_process = require('child_process');

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

const CI_DATA = {
  root: getGitRoot(),
  name: getProjectName(),
};

module.exports = {
  cacheDirectory: `${CI_DATA.root ?? '.'}/.jest-cache`,

  preset: process.env.CI ? undefined : 'ts-jest',

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Use this configuration option to add custom reporters to Jest
  reporters: ['default', `${CI_DATA.root}/packages/common-test/dist/jest/reporter.js`],
  // Automatically reset mock state between every test
  resetMocks: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: [process.cwd() + (process.env.CI ? '/dist' : '/src')],

  // The test environment that will be used for testing
  testEnvironment: 'node',
};
