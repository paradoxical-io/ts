import { safeExpect } from '@paradoxical-io/common-test';
import { CompoundKey, SortKey } from '@paradoxical-io/types';

import { newDynamoDocker } from '../docker';
import { dynamoTableName, KeyValueCounter, KeyValueCountTableDao } from '../index';
import { KeyValueTable, KeyValueTableDao } from './keyTable';
import { PartitionedKeyValueTable, PartitionedKeyValueTableDao } from './partitionedKeyTable';
import { PartitionedKeyCounterTableDao, PartitionedKeyValueCounter } from './partitionedKeyValueCounter';

test('creates and manages keys', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(KeyValueTableDao, table);

    const keys = new KeyValueTable({ namespace: 'test', dynamo: docker.dynamo, tableName: table });

    const keyName = 'foo';

    const foo = await keys.get(keyName);
    expect(foo).toBeFalsy();

    await keys.set(keyName, 1);

    const result = await keys.get<number>(keyName);

    expect(result).toEqual(1);

    await keys.delete(keyName);

    expect(await keys.get(keyName)).toBeUndefined();
  } finally {
    await docker.container.close();
  }
});

test('creates and manages key counters', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(KeyValueCountTableDao, table);

    const keys = new KeyValueCounter({ namespace: 'test', dynamo: docker.dynamo, tableName: table });

    const keyName = 'foo';

    const nothing = await keys.get([]);
    expect(nothing).toEqual([]);

    const [foo] = await keys.get([keyName]);
    expect(foo.count).toEqual(undefined);

    const incremented = await keys.incr(keyName, 10);
    expect(incremented).toEqual(10);

    const [result] = await keys.get([keyName]);
    expect(result.count).toEqual(10);

    const decremented = await keys.decr(keyName, 5);
    expect(decremented).toEqual(5);

    await keys.delete(keyName);

    expect((await keys.get([keyName]))[0].count).toBeUndefined();
  } finally {
    await docker.container.close();
  }
});

test('creates and manages partitioned key counters', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(PartitionedKeyCounterTableDao, table);

    const keys = new PartitionedKeyValueCounter({ dynamo: docker.dynamo, tableName: table });

    const keyName: CompoundKey<string, number> = {
      partition: 'test',
      sort: 'test' as SortKey,
      namespace: 'test',
    };

    const nothing = await keys.get(keyName);
    expect(nothing).toEqual(undefined);

    const incremented = await keys.incr(keyName, 10);
    expect(incremented).toEqual(10);

    const result = await keys.get(keyName);
    expect(result).toEqual(10);

    const decremented = await keys.decr(keyName, 5);
    expect(decremented).toEqual(5);

    await keys.delete(keyName);

    expect(await keys.get(keyName)).toBeUndefined();
  } finally {
    await docker.container.close();
  }
});

test('creates and manages partitioned key values', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(PartitionedKeyValueTableDao, table);

    const keys = new PartitionedKeyValueTable({ dynamo: docker.dynamo, tableName: table });

    const keyName: CompoundKey<string, number> = {
      partition: 'test',
      sort: 'test' as SortKey,
      namespace: 'test',
    };

    const nothing = await keys.get(keyName);
    expect(nothing).toEqual(undefined);

    await keys.set(keyName, 10);
    const incremented = await keys.get(keyName);
    expect(incremented).toEqual(10);

    const result = await keys.get(keyName);
    expect(result).toEqual(10);

    await keys.set(keyName, 5);
    const decremented = await keys.get(keyName);
    expect(decremented).toEqual(5);

    await keys.delete(keyName);

    expect(await keys.get(keyName)).toBeUndefined();
  } finally {
    await docker.container.close();
  }
});

test('creates and manages partitioned key sets', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(PartitionedKeyValueTableDao, table);

    const keys = new PartitionedKeyValueTable({ dynamo: docker.dynamo, tableName: table });

    const keyName: CompoundKey<string, string[]> = {
      partition: 'test',
      sort: 'test' as SortKey,
      namespace: 'test',
    };

    await keys.addToSet(keyName, 'foo');

    safeExpect(await keys.get(keyName)).toEqual(['foo']);

    await keys.addToSet(keyName, 'bar');

    safeExpect(await keys.get(keyName)).toEqual(['foo', 'bar']);
    await keys.removeFromSet(keyName, 'foo');

    safeExpect(await keys.get(keyName)).toEqual(['bar']);
  } finally {
    await docker.container.close();
  }
});

test('is parallel safe when for partitioned key sets', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(PartitionedKeyValueTableDao, table);

    const keys = new PartitionedKeyValueTable({ dynamo: docker.dynamo, tableName: table });

    const keyName: CompoundKey<string, number[]> = {
      partition: 'test',
      sort: 'test' as SortKey,
      namespace: 'test',
    };

    const data = [...Array(50)].map((_, idx) => idx);

    await Promise.all(data.map(d => keys.addToSet(keyName, d)));

    const result = await keys.get(keyName);

    safeExpect(result?.sort()).toEqual(data.sort());
  } finally {
    await docker.container.close();
  }
});

test('skips existing data if it exists', async () => {
  const table = dynamoTableName('test.keys');
  const docker = await newDynamoDocker();
  try {
    await docker.createTable(PartitionedKeyValueTableDao, table);

    const keys = new PartitionedKeyValueTable({ dynamo: docker.dynamo, tableName: table });

    const keyName: CompoundKey<string, number[]> = {
      partition: 'test',
      sort: 'test' as SortKey,
      namespace: 'test',
    };

    const data = [...Array(2)].map((_, idx) => idx);

    safeExpect(await keys.addToSet(keyName, data)).toEqual(true);
    safeExpect(await keys.addToSet(keyName, data)).toEqual(false);

    const result = await keys.get(keyName);

    safeExpect(result?.sort()).toEqual(data.sort());
  } finally {
    await docker.container.close();
  }
});
