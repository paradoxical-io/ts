import { ColumnNames, CrudBase } from '../crudBase';
import { getColumnNameFunction } from './queryBuilderHelpers';

class TestModel extends CrudBase {
  static columnNames: ColumnNames<TestModel> = {
    col1: 'column_1',
    col2: 'column_2',
  };

  id!: number;

  col1!: string;

  col2!: number;
}

test('correct column names are returned without an alias', () => {
  const f = getColumnNameFunction(TestModel);
  // id is a special case because it's omitted from the ColumnNames definition
  expect(f('id')).toEqual('id');

  // the crud base columns are also special cased
  expect(f('createdAt')).toEqual('created_at');

  // 'normal' column for the type
  expect(f('col1')).toEqual('column_1');
});

test('correct column names are returned with an alias', () => {
  const f = getColumnNameFunction(TestModel, 'alias');
  // id is a special case because it's omitted from the ColumnNames definition
  expect(f('id')).toEqual('alias.id');

  // the crud base columns are also special cased
  expect(f('createdAt')).toEqual('alias.created_at');

  // 'normal' column for the type
  expect(f('col1')).toEqual('alias.column_1');
});
