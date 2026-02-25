import { currentEnvironment, isLocal, isRemote, log, Metrics } from '@paradoxical-io/common-server';
import { DataSource } from 'typeorm';
import { MysqlDriver } from 'typeorm/driver/mysql/MysqlDriver';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';

import { CrudBase } from './crudBase';
import { AWS_RDS_PROFILE } from './ssl/profiles';

/**
 * Public configurations for MySQL
 */
export interface MySQLOptions {
  hostname: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  connectionCount?: number;
  connectionName?: string;
}

/**
 * PrivateOptions are internal options configured for the factory that consumers
 * cannot configure
 */
interface PrivateOptions {
  useSSL?: boolean;
}

/**
 * All Options are the public ones and the private ones together
 */
type AllMySQLOptions = MySQLOptions & PrivateOptions;

export class ConnectionFactory {
  /**
   * Takes a set of model constructors.  These must be class constructor references that subclass CrudBase
   * @param entities
   */
  constructor(private entities?: Array<{ new (): CrudBase }>) {}

  async mysql(options: MySQLOptions): Promise<DataSource> {
    const defaultConnectionSize = currentEnvironment() === 'prod' ? 20 : 5;

    const envVar = process.env.PARADOX_MYSQL_CONNECTION_POOL_SIZE;

    const overrideSize = envVar && Number.isInteger(envVar) ? Number.parseInt(envVar, 10) : undefined;

    const defaults: Partial<AllMySQLOptions> = {
      connectionCount: overrideSize ?? defaultConnectionSize,
      useSSL: currentEnvironment() !== 'local',
    };

    const opts: AllMySQLOptions = Object.assign({}, defaults, options);

    const dbLog = log.with({
      host: `${opts.hostname}:${opts.port}`,
      database: opts.database,
    });

    dbLog
      .with({
        username: opts.username,
        useSSL: opts.useSSL,
        connectionCount: opts.connectionCount,
        name: options.connectionName,
      })
      .info(`Creating mysql connection pool`);

    let loggingOptions: LoggerOptions;

    if (log.isQuiet()) {
      loggingOptions = false;
    } else if (isLocal && process.env.PARADOX_MYSQL_LOGGING_LEVEL) {
      loggingOptions = process.env.PARADOX_MYSQL_LOGGING_LEVEL as LoggerOptions;
    } else {
      loggingOptions = ['warn', 'info', 'log'];
    }

    const isReadReplica = opts.hostname.includes('read-replica');

    const sync =
      !isReadReplica &&
      ((currentEnvironment() !== 'prod' && isRemote) || (currentEnvironment() === 'local' && isLocal));

    if (sync) {
      dbLog.info('Database synchronize is allowed!');
    } else {
      dbLog.info('Database synchronize is not allowed!');
    }

    if (isReadReplica) {
      dbLog.info('DB url is a read replica ');
    }

    // https://github.com/mysqljs/mysql#ssl-options
    let sslOptions: { rejectUnauthorized: false } | typeof AWS_RDS_PROFILE | undefined;

    if (opts.useSSL) {
      if (opts.hostname?.includes('proxy')) {
        sslOptions = { rejectUnauthorized: false };
      } else {
        sslOptions = AWS_RDS_PROFILE;
      }
    }

    try {
      const dataSource = new DataSource({
        type: 'mysql',
        host: opts.hostname,
        port: opts.port,
        username: opts.username,
        password: opts.password,
        database: opts.database,
        /**
         * Support bigints
         */
        supportBigNumbers: true,

        logging: loggingOptions,
        charset: 'utf8mb4',
        synchronize: sync,
        timezone: 'Z',
        name: opts.connectionName,

        ssl: sslOptions,

        entities: this.entities,

        // log slow queries that take 2 seconds
        maxQueryExecutionTime: 2000,

        // these get passed to the underlying driver
        // https://github.com/sidorares/node-mysql2#using-connection-pools
        extra: {
          connectionLimit: opts.connectionCount,
        },
      });

      const conn = await dataSource.initialize();

      if (conn.driver instanceof MysqlDriver) {
        const tags = { schema: opts.database || 'unknown' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pool: any = (conn.driver as MysqlDriver).pool;

        const idMap: { [id: string]: number } = {};

        // attach listeners on the mysql2 driver for metrics on pool activity
        pool.on('acquire', (conn: { threadId?: number }) => {
          if (conn.threadId) {
            idMap[conn.threadId] = new Date().getTime();
          }

          Metrics.instance.increment('mysql.connection.active', tags);
        });

        pool.on('release', (conn: { threadId?: number }) => {
          Metrics.instance.increment('mysql.connection.active', -1, tags);

          if (conn.threadId && idMap[conn.threadId]) {
            Metrics.instance.timing('mysql.connection.active_time', new Date().getTime() - idMap[conn.threadId], tags);
            delete idMap[conn.threadId];
          }
        });

        pool.on('enqueue', () => Metrics.instance.increment('mysql.connection.enqueue', tags));
        pool.on('connection', () => Metrics.instance.increment('mysql.connection.new_connection', tags));
      }
      return conn;
    } catch (err) {
      const message = `Error while creating connection to ${opts.username}@${opts.hostname}`;

      dbLog.error(message, err);

      throw new Error(message);
    }
  }

  async sqlite(synchronize = true): Promise<DataSource> {
    const id = Math.random().toString();

    const name = process.env.JEST_TEST ? `${expect.getState().currentTestName}_${new Date().getTime()}_${id}` : id;

    const path = `${process.cwd()}/.db/runs/${name}.db`;

    // if the env var is set will dump the sqlite db to disk, otherwise will use it in memory
    const dbName = process.env.PARADOX_DEBUG_SQLITE_DB ? path : ':memory:';

    const dataSource = new DataSource({
      type: 'sqlite',
      database: dbName,
      logging: process.env.PARADOX_SQLITE_LOGGING === undefined ? ['warn', 'info', 'log'] : 'all',
      synchronize: false,
      maxQueryExecutionTime: 1000,
      entities: this.entities,
    });

    const conn = await dataSource.initialize();

    if (synchronize) {
      await conn.synchronize();
    }

    return conn;
  }
}
