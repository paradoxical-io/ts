import { XPath } from '@paradoxical-io/common';
import {
  DataSourceOptions,
  FindOperator,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  ObjectLiteral,
  QueryBuilder,
  Repository,
} from 'typeorm';
import { RelationCountLoader } from 'typeorm/query-builder/relation-count/RelationCountLoader';
import { RelationIdLoader } from 'typeorm/query-builder/relation-id/RelationIdLoader';
import { RawSqlResultsToEntityTransformer } from 'typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer';
import { DateUtils } from 'typeorm/util/DateUtils';

import { ColumnName } from './queryBuilderHelpers';

export class CustomOperators {
  constructor(private driver: DataSourceOptions) {}

  /**
   * sqlite does not have a date field, internally they are stored as a string.
   * This DateUtils function is exactly how TypeORM transforms the date before writing to the sqlite db.
   * https://github.com/typeorm/typeorm/issues/2286#issuecomment-813106077
   * @param date
   * @private
   */
  private sqliteFormat(date: Date): string {
    return DateUtils.mixedDateToUtcDatetimeString(date);
  }

  /**
   * https://github.com/typeorm/typeorm/issues/6803#issuecomment-864681382
   * @param raw
   * @param repository
   * @param qb
   * @private
   */
  private async rawResultsToEntities<T extends ObjectLiteral>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: any[],
    repository: Repository<T>,
    qb: QueryBuilder<T>
  ): Promise<T[]> {
    if (qb.expressionMap.mainAlias === undefined) {
      throw new Error('QueryBuilder expression map should have a main alias');
    }

    const entityManager = repository.manager;

    const queryRunner = entityManager.connection.createQueryRunner();
    const relationIdLoader = new RelationIdLoader(
      entityManager.connection,
      queryRunner,
      qb.expressionMap.relationIdAttributes
    );
    const relationCountLoader = new RelationCountLoader(
      entityManager.connection,
      queryRunner,
      qb.expressionMap.relationCountAttributes
    );
    const rawRelationIdResults = await relationIdLoader.load(raw);
    const rawRelationCountResults = await relationCountLoader.load(raw);
    const transformer = new RawSqlResultsToEntityTransformer(
      qb.expressionMap,
      entityManager.connection.driver,
      rawRelationIdResults,
      rawRelationCountResults,
      queryRunner
    );

    // Transform the raw results into entities
    return transformer.transform(raw, qb.expressionMap.mainAlias);
  }

  /**
   * Safely formats the query param for date formats of sqlite if the type is a date
   * @param param
   */
  safeFormatParam(param: unknown): unknown {
    if (this.driver.type === 'sqlite' && param instanceof Date) {
      return this.sqliteFormat(param);
    }

    return param;
  }

  MoreThanDate(date: Date): FindOperator<Date> {
    if (this.driver.type === 'sqlite') {
      return MoreThan(this.sqliteFormat(date)) as unknown as FindOperator<Date>;
    }
    return MoreThan(date);
  }

  MoreThanOrEqualDate(date: Date): FindOperator<Date> {
    if (this.driver.type === 'sqlite') {
      return MoreThanOrEqual(this.sqliteFormat(date)) as unknown as FindOperator<Date>;
    }

    return MoreThanOrEqual(date);
  }

  LessThanDate(date: Date): FindOperator<Date> {
    if (this.driver.type === 'sqlite') {
      return LessThan(this.sqliteFormat(date)) as unknown as FindOperator<Date>;
    }

    return LessThan(date);
  }

  LessThanOrEqualDate(date: Date): FindOperator<Date> {
    if (this.driver.type === 'sqlite') {
      return LessThanOrEqual(this.sqliteFormat(date)) as unknown as FindOperator<Date>;
    }

    return LessThanOrEqual(date);
  }

  async union<R extends ObjectLiteral>(repository: Repository<R>, ...queries: QueryBuilder<R>[]): Promise<R[]> {
    if (queries.length === 0) {
      return [];
    }

    const stringfyQuery = (query: UnionParameters, queryBuilder: QueryBuilder<R>, index: number): UnionParameters => {
      const [sql, parameters] = queryBuilder.connection.driver.escapeQueryWithParameters(
        queryBuilder.getQuery(),
        queryBuilder.getParameters(),
        {}
      );
      if (index === 0) {
        return { sql, parameters };
      }
      return {
        sql: `${query.sql} UNION ${sql}`,
        parameters: query.parameters.concat(...parameters),
      };
    };

    const { sql, parameters } = queries.reduce(stringfyQuery, { sql: '', parameters: [] });

    const rawResults = await repository.query(sql, parameters);

    return this.rawResultsToEntities(rawResults, repository, queries[0]);
  }

  XPath(field: ColumnName, xpath: XPath): string {
    if (this.driver.type === 'sqlite') {
      return `json_extract(${field}, '${xpath}')`;
    }

    return `${field}->'${xpath}'`;
  }
}

interface UnionParameters {
  sql: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: any[];
}
