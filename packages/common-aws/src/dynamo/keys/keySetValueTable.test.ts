import { mock } from '@paradoxical-io/common-test/dist/jest';

import { KeySetValueTable } from './keySetValueTable';
import { KeyValueTable } from './keyTable';

test('returns empty array when the key does not exist', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  table.get.mockResolvedValue(undefined);

  await expect(keySetValue.get('test')).resolves.toEqual([]);
});

test('retrieves by key', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  table.get.mockResolvedValue(['value']);

  const values = await keySetValue.get('test');
  expect(table.get).toHaveBeenCalledWith('test');
  expect(values).toEqual(['value']);
});

test('appends by key', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  table.get.mockResolvedValue(['value']);

  await keySetValue.append('test', 'value2');

  expect(table.set).toHaveBeenCalledWith('test', ['value', 'value2']);
});

test('does not append duplicate values by key', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  table.get.mockResolvedValue(['value']);

  await keySetValue.append('test', 'value');

  expect(table.set).not.toHaveBeenCalled();
});

test('checks existence', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  table.get.mockResolvedValueOnce(undefined).mockResolvedValue(['value']);

  await expect(keySetValue.exists('test')).resolves.toEqual(false);
  await expect(keySetValue.exists('test')).resolves.toEqual(true);
});

test('sets full value', async () => {
  const table = newTable();
  const keySetValue = new KeySetValueTable<string, string>(s => s, table);

  await keySetValue.set('test', ['value1']);

  expect(table.set).toHaveBeenCalledWith('test', ['value1']);
});

const newTable = () => mock<KeyValueTable>();
