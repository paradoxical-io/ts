import { xpath } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';
import { Column, DataSource, Entity, PrimaryColumn, PrimaryGeneratedColumn, Repository } from 'typeorm';

import { ConnectionFactory } from './connectionFactory';
import { ColumnNames, CrudBase } from './crudBase';
import { SqlDataAccessBase } from './dataAccessBase';
import { getColumnNameFunction } from './typeorm/queryBuilderHelpers';
import { JsonTransformer } from './typeorm/transformers/jsonTransformer';

@Entity({ name: 'test' })
class TestModel extends CrudBase {
  static columnNames: ColumnNames<TestModel> = {
    data: 'data',
  };

  @PrimaryColumn()
  id!: string;

  @Column({
    type: 'text',
    transformer: new JsonTransformer<Data>(),
  })
  data!: Data;
}

@Entity({ name: 'test' })
class TestModelNumericColumn extends CrudBase {
  static columnNames: ColumnNames<TestModelNumericColumn> = {
    data: 'data',
  };

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'text',
  })
  data!: string;
}

interface Data {
  field1: string;
  nested?: {
    field2: string;
    optionalArray: Array<{ field: string }>;
  } | null;
}

class TestRepo extends SqlDataAccessBase {
  public constructor(conn: DataSource) {
    super(conn);
  }

  testModel(): Repository<TestModel> {
    return this.getRepo<TestModel>(TestModel);
  }

  testModelWithNumeric(): Repository<TestModelNumericColumn> {
    return this.getRepo<TestModelNumericColumn>(TestModelNumericColumn);
  }

  field1Xpath(value: string): Promise<TestModel | null> {
    const columns = getColumnNameFunction<TestModel>(TestModel);
    return this.testModel()
      .createQueryBuilder()
      .where(`${this.operators.XPath(columns('data'), xpath<Data>().field('field1').path)} = '${value}'`)
      .getOne();
  }
}

test('delete is explicitly denied', async () => {
  const test = new TestRepo(await newConn());

  expect(() => test.testModel().delete('1')).toThrow(/Hard deletes are not allowed/);
});

test('queries json xpath fields', async () => {
  const test = new TestRepo(await newConn());

  await test
    .testModel()
    .save({ id: '1', data: { field1: 'field1', nested: { field2: 'field12', array: ['a', 'b'] } } });
  await test
    .testModel()
    .save({ id: '2', data: { field1: 'field2', nested: { field2: 'field22', array: ['c', 'd'] } } });

  const qb = test.testModel().createQueryBuilder();

  const path = xpath<Data>().field('nested').field('field2').path;

  const result = await qb.where(`json_extract(data, '${path}') = 'field12'`).getOne();

  safeExpect(result!.data.nested?.field2).toEqual('field12');
});

test('queries json xpath fields with operators', async () => {
  const test = new TestRepo(await newConn());

  await test
    .testModel()
    .save({ id: '1', data: { field1: 'field1', nested: { field2: 'field12', array: ['a', 'b'] } } });
  await test
    .testModel()
    .save({ id: '2', data: { field1: 'field2', nested: { field2: 'field22', array: ['c', 'd'] } } });

  const result2 = await test.field1Xpath(`field1`);

  safeExpect(result2!.data.nested?.field2).toEqual('field12');
});

test('queries json xpath arrays', async () => {
  const test = new TestRepo(await newConn());

  await test.testModel().save({
    id: '1',
    data: { field1: 'field1', nested: { field2: 'field12', optionalArray: [{ field: 'a' }, { field: 'b' }] } },
  });
  await test.testModel().save({
    id: '2',
    data: { field1: 'field2', nested: { field2: 'field22', optionalArray: [{ field: 'c' }, { field: 'd' }] } },
  });

  const qb = test.testModel().createQueryBuilder();

  const path = xpath<Data>().field('nested').field('optionalArray').index(1).field('field').path;

  const result = await qb.where(`json_extract(data, '${path}') = 'd'`).getOne();

  safeExpect(result!.data.nested?.field2).toEqual('field22');
});

async function newConn() {
  const f = new ConnectionFactory([TestModel, TestModelNumericColumn]);

  return f.sqlite(true);
}
