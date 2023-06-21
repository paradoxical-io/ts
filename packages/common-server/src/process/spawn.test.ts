import { runShell } from './spawn';

test('spawn result codes', async () => {
  const code = await runShell('exit 2', { acceptableErrorCodes: [2], verbose: false, cwd: process.cwd() });
  expect(code).toEqual(2);
});
