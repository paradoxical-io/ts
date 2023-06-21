import { safeExpect } from '@paradoxical-io/common-test';

import { existsPath, getAbsPath } from './paths';

test('paths are resolved directly', () => {
  expect(getAbsPath('~/foo')).toEqual(`${process.env.HOME}/foo`);
  expect(getAbsPath('foo')).toEqual(`${process.cwd()}/foo`);
  expect(getAbsPath('./foo')).toEqual(`${process.cwd()}/foo`);
  expect(getAbsPath('/foo')).toEqual('/foo');
});

test('path exists', async () => {
  safeExpect(await existsPath('asdfasdf')).toEqual(false);
  safeExpect(await existsPath(__filename)).toEqual(true);
});
