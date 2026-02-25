import { Limiter } from '@paradoxical-io/common';
import { ErrorCode, ErrorWithCode } from '@paradoxical-io/types';
import { DataSource, EntityManager, ObjectLiteral, QueryRunner, Repository } from 'typeorm';
import { DatabaseType } from 'typeorm/driver/types/DatabaseType';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { CustomOperators } from './typeorm/operators';

export enum SqlError {
  DuplicateEntry,
  Unknown,
}

export const rowNumberPointerPagingOrdinalName = 'sort_ordinal';

export function isNotFoundError(err: Error | unknown): err is EntityNotFoundError {
  return err instanceof EntityNotFoundError;
}

export abstract class SqlDataAccessBase {
  protected readonly operators: CustomOperators;

  private readonly transactionWrapper: <T>(p: () => Promise<T>) => Promise<T>;

  private readonly driver: DatabaseType;

  protected constructor(protected conn: DataSource) {
    this.driver = conn.options.type;

    // sqlite only supports a single connection
    // so parallel transactions will always fail
    // wrap the transaction provider in a limiter that only allows 1 concurrent request
    // so we can queue off promises under the hood
    // basically its implementing https://github.com/typeorm/typeorm/issues/307
    // create the wrapper here so we can have a single closed over instance of the limiter
    if (conn.options.type === 'sqlite') {
      const limiter = new Limiter({ maxConcurrent: 1 });
      this.transactionWrapper = <T>(p: () => Promise<T>) => limiter.wrap(p);
    } else {
      // for not sqlite just no-op and do the transaction
      this.transactionWrapper = p => p();
    }
    this.operators = new CustomOperators(this.conn.options);
  }

  async close() {
    await this.conn.destroy();
  }

  protected getRepo = <T extends ObjectLiteral>(f: Function): Repository<T> => {
    const r = this.conn.manager.getRepository<T>(f);

    // @ts-ignore
    r.delete = () => {
      throw new Error('Hard deletes are not allowed, use soft deletes!');
    };

    return r;
  };

  /**
   * Returns whether or not the current driver is for sqlite. Can be useful for testing and when
   * certain things that work in MySQL don't work in sqlite.
   * @protected
   */
  protected isSqlite(): boolean {
    return this.driver === 'sqlite';
  }

  /**
   * Auto commit the block in a transaction. Will auto roll back on exceptions
   * @param block
   */
  protected async transaction<T>(block: (r: EntityManager) => Promise<T>): Promise<T> {
    return this.transactionWrapper(() => this.conn.transaction<T>(async manager => block(manager)));
  }

  /**
   * Manually manage transaction commit states. This is a lower level API and should not be used unless
   * absolutely necessary
   * @param block
   */
  protected async queryRunner<T>(block: (r: QueryRunner) => Promise<T>): Promise<T> {
    return this.transactionWrapper(async () => {
      const runner = this.conn.createQueryRunner();
      await runner.connect();
      try {
        return await block(runner);
      } finally {
        await runner.release();
      }
    });
  }

  /**
   * Safe runs the block and maps ignores duplicate error codes
   * @param block
   * @returns true if it was inserted, false if it was ignored
   *
   */
  protected async ignoreDuplicates<T>(block: () => Promise<T>): Promise<boolean> {
    try {
      await block();
      return true;
    } catch (error) {
      const et = this.getSqlErrorType(error);

      if (et === SqlError.DuplicateEntry) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Safe runs the block and maps known sql errors to error codes
   * @param block
   */
  protected async safe<T>(block: () => Promise<T>): Promise<T> {
    try {
      return await block();
    } catch (error) {
      const et = this.getSqlErrorType(error);

      if (et === SqlError.DuplicateEntry) {
        throw new ErrorWithCode(ErrorCode.ItemAlreadyExists);
      }

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getSqlErrorType = (err: any): SqlError => {
    const sqlite =
      err.code === 'SQLITE_CONSTRAINT' && 'message' in err && err.message.indexOf('UNIQUE constraint failed') > 0;

    if (err.code === 'ER_DUP_ENTRY' || sqlite) {
      return SqlError.DuplicateEntry;
    }
    return SqlError.Unknown;
  };

  protected async insertIfNotExist<T extends { id: string | number }>(
    modelType: new () => T,
    model: QueryDeepPartialEntity<T> & { id: string | number }
  ): Promise<T> {
    const repo = this.getRepo<T>(modelType);
    await this.ignoreDuplicates(() => repo.insert(model));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return repo.findOneOrFail({ where: { id: model.id } as any });
  }

  /**
   * Wraps up an automatic update to the model
   * @param modelType
   * @param id
   * @param model
   * @protected
   */
  protected async update<T extends { id: string | number }>(
    modelType: new () => T,
    id: string | number,
    model: QueryDeepPartialEntity<T>
  ): Promise<void> {
    const repo = this.getRepo<T>(modelType);

    await repo.update(id, model);
  }
}
