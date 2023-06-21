/**
 * Jest Integration config. To run integration tests
 *
 * This file inherits from the root jest config and overrides the testRegex
 *
 * 1. Create a file called <whatever>.itest.ts
 * 2. Make sure at the root of your package you have a SYMLINK to the root jest.int.config.ks
 * 3. Run jest in your shell or your local IDE with the flag of -c jest.int.config.js
 *
 */

const config = require('./jest.config');
config.testRegex = 'itest\\.ts$'; //Overriding testRegex option
console.log('RUNNING INTEGRATION TESTS');

// itests shouldn't really time out
config.testTimeout = 99999999;

process.env.INTEGRATION_TESTS = 'true';

// normally we don't await analytics because they are fire and forget. this is done
// to optimize hot paths. When services are shut down the process waits for all promises to be done
// so things do eventually flush. However, in itests we don't wait on analytics and this can cause
// tests and scratchpads to be missing core analytics that we still want.
process.env.PARADOX_AWAIT_ANALYTICS = 'true';

// because itests are often used to drive against prod
// ensure that all actions are written to disk for later auditing
process.env.PARADOX_WRITE_LOG_FILE = 'true';

module.exports = config;
