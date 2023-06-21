import { Column, CreateDateColumn, Index, UpdateDateColumn, VersionColumn } from 'typeorm';

/**
 * ColumnNames defines an object whose keys are the same of a data model
 * except for the base class values and the special case of 'id'
 *
 * @param T the entity model
 * @param Y optional fields to exclude from column names that are properties on T
 */
export type ColumnNames<T extends CrudBase, Y extends keyof T = never> = {
  [P in keyof Omit<T, keyof VersionedCrudBase | 'id' | Y>]-?: string;
};

/**
 * Only entity fields that excludes fields from CrudBase and any option other fields (like pseudo objects)
 *
 * For example:
 *
 * class User extends CrudBase {
 *    id: number;
 *    ignore: string
 * }
 *
 * EntityFieldsOnly<User, 'ignore'> === { id: number }
 */
export type EntityFieldsOnly<T extends CrudBase, K extends keyof T = never> = Omit<T, keyof CrudBase | K>;

function TableScopedIndex(name: string): PropertyDecorator {
  return (target, propertyKey) => {
    // sqlite requires that indexes be globally unique named.
    // since this is only applied on the root crud indexes ignore them for sqlite
    if (!process.env.JEST_TEST) {
      return Index(name)(target, propertyKey);
    }
  };
}

export abstract class CrudBase {
  static columns: { [key: string]: string } = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  };

  @TableScopedIndex('created_at_idx')
  @CreateDateColumn({ name: CrudBase.columns.createdAt, type: 'datetime' })
  createdAt!: Date;

  @TableScopedIndex('updated_at_idx')
  @UpdateDateColumn({ name: CrudBase.columns.updatedAt, type: 'datetime' })
  updatedAt!: Date;

  @TableScopedIndex('deleted_at_idx')
  @Column({ name: CrudBase.columns.deletedAt, type: 'datetime', nullable: true })
  deletedAt?: Date | null;
}

export class VersionedCrudBase extends CrudBase {
  @VersionColumn()
  version!: number;
}
