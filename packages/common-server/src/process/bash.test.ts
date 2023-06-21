import * as fs from 'fs';

import { get, run, runStream } from './bash';

test('get returns a value', () => {
  expect(get('echo foo').trim()).toEqual('foo');
});

test('get takes env variables', () => {
  expect(get('echo $FOO', { env: { FOO: 'bar' } }).trim()).toEqual('bar');
});

test('get passes process.env by default', () => {
  process.env.TEST_FOO = 'foo';
  expect(get('echo $TEST_FOO').trim()).toEqual('foo');
});

test('run stream proxies stdout', async () => {
  const spy = jest.spyOn(process.stdout, 'write');

  const result = await runStream({ cmd: 'echo', args: ['foo'] });

  expect(result.output.trim()).toEqual('foo');

  const output = spy.mock.calls[1][0];

  expect(output.toString().trim()).toEqual('foo');
});

test('run stream redacts when printing to console log', async () => {
  const spy = jest.spyOn(process.stdout, 'write');

  await runStream({ cmd: 'echo', args: ['foo', 'private'], options: { redactKeys: ['private'] } });

  const output = spy.mock.calls[0][0];

  expect(output.toString().trim()).toContain('> echo foo *****');
  expect(output.toString().trim()).not.toContain('private');
});

test('run runs', () => {
  const file = `test-${Math.random() * 1000}.tmp`;
  run(`echo foo > ${file}`);
  expect(fs.existsSync(file)).toEqual(true);

  try {
    fs.unlinkSync(file);
  } catch {
    // do nothing
  }
});
