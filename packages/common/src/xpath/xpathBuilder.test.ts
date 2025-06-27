import { safeExpect } from '@paradoxical-io/common-test';

import { XPath, xpath } from './xpathBuilder';

interface Data {
  field1: string;
  nested?: {
    field2: string;
    optionalArray: Array<{ field: string }>;
  } | null;
}

test('xpath top  level', async () => {
  const path = xpath<Data>().field('field1').path;

  safeExpect(path).toEqual('$.field1' as XPath);
});

test('xpath objects', async () => {
  const path = xpath<Data>().field('nested').field('field2').path;

  safeExpect(path).toEqual('$.nested.field2' as XPath);
});

test('xpath arrays', async () => {
  const path = xpath<Data>().field('nested').field('optionalArray').index(1).field('field').path;

  safeExpect(path).toEqual('$.nested.optionalArray[1].field' as XPath);
});
