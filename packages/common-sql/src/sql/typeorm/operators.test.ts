import { epochNow } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';
import { EpochMS } from '@paradoxical-io/types';
import { Column, Connection, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

import { ConnectionFactory } from '../connectionFactory';
import { ColumnNames, CrudBase } from '../crudBase';
import { SqlDataAccessBase } from '../dataAccessBase';
import { CustomOperators } from './operators';

@Entity({ name: 'test' })
class TestModel extends CrudBase {
  static columnNames: ColumnNames<TestModel> = {
    col1: 'column_1',
  };

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: TestModel.columnNames.col1, type: 'datetime' })
  col1!: Date;
}

class TestRepo extends SqlDataAccessBase {
  public constructor(conn: Connection) {
    super(conn);
  }

  testModel(): Repository<TestModel> {
    return this.getRepo<TestModel>(TestModel);
  }

  getOperators(): CustomOperators {
    return this.operators;
  }
}

const now = epochNow();

const times = {
  now,
  before: (now - 1) as EpochMS,
  after: (now + 1) as EpochMS,
};

describe('date operators', () => {
  test.each([
    [times.now, false],
    [times.before, false],
    [times.after, true],
  ] as Array<[EpochMS, boolean]>)('more than date', async (modelCol1Epoch, inWhereClause) => {
    const db = new TestRepo(await newConn());

    await db.testModel().save({ col1: new Date(modelCol1Epoch) });

    const result = await db.testModel().findOne({ col1: db.getOperators().MoreThanDate(new Date(now)) });

    safeExpect(result).negated(!inWhereClause).toBeDefined();
  });

  test.each([
    [times.now, true],
    [times.before, false],
    [times.after, true],
  ] as Array<[EpochMS, boolean]>)('more than or equal to date', async (modelCol1Epoch, inWhereClause) => {
    const db = new TestRepo(await newConn());

    await db.testModel().save({ col1: new Date(modelCol1Epoch) });

    const result = await db.testModel().findOne({ col1: db.getOperators().MoreThanOrEqualDate(new Date(now)) });

    safeExpect(result).negated(!inWhereClause).toBeDefined();
  });

  test.each([
    [times.now, false],
    [times.before, true],
    [times.after, false],
  ] as Array<[EpochMS, boolean]>)('less than date', async (modelCol1Epoch, inWhereClause) => {
    const db = new TestRepo(await newConn());

    await db.testModel().save({ col1: new Date(modelCol1Epoch) });

    const result = await db.testModel().findOne({ col1: db.getOperators().LessThanDate(new Date(now)) });

    safeExpect(result).negated(!inWhereClause).toBeDefined();
  });

  test.each([
    [times.now, true],
    [times.before, true],
    [times.after, false],
  ] as Array<[EpochMS, boolean]>)('less than or equal to date', async (modelCol1Epoch, inWhereClause) => {
    const db = new TestRepo(await newConn());

    await db.testModel().save({ col1: new Date(modelCol1Epoch) });

    const result = await db.testModel().findOne({ col1: db.getOperators().LessThanOrEqualDate(new Date(now)) });

    safeExpect(result).negated(!inWhereClause).toBeDefined();
  });
});

async function newConn() {
  const f = new ConnectionFactory([TestModel]);

  return f.sqlite(true);
}
