// tslint:disable:variable-name
import { format } from 'date-fns';
import {
  ConnectionOptions,
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

import { ColumnName } from './queryBuilderHelpers';
import { XPath } from './xpathBuilder';

// TypeORM query operators polyfills from https://github.com/typeorm/typeorm/issues/2286#issuecomment-499764915
// Keep in mind, the format string in that linked comment is wrong, but we do need to format the timestamp for sqlite
enum EDateType {
  Datetime = 'yyyy-MM-dd HH:mm:ss.SSSS',
}

export class CustomOperators {
  constructor(private driver: ConnectionOptions) {}

  private sqliteFormat(date: Date): string {
    return format(date, EDateType.Datetime);
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

  MoreThanDate(date: Date): FindOperator<Date | string> {
    if (this.driver.type === 'sqlite') {
      return MoreThan(this.sqliteFormat(date));
    }
    return MoreThan(date);
  }

  MoreThanOrEqualDate(date: Date): FindOperator<Date | string> {
    if (this.driver.type === 'sqlite') {
      return MoreThanOrEqual(this.sqliteFormat(date));
    }

    return MoreThanOrEqual(date);
  }

  LessThanDate(date: Date): FindOperator<Date | string> {
    if (this.driver.type === 'sqlite') {
      return LessThan(this.sqliteFormat(date));
    }

    return LessThan(date);
  }

  LessThanOrEqualDate(date: Date): FindOperator<Date | string> {
    if (this.driver.type === 'sqlite') {
      return LessThanOrEqual(this.sqliteFormat(date));
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
