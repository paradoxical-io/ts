import { isRemote, log, Metrics } from '@paradoxical-io/common-server';
import { Connection } from 'typeorm';

export class SqlStats {
  constructor(private name: string, private conn: Connection) {}

  /**
   * Monitors the lag time to issue a select 1 query
   * @param frequencyMS
   */
  monitorLag({ frequencyMS = 1000 }: { frequencyMS?: number } = {}): void {
    log.info(`monitoring ${this.name} db every ${frequencyMS} ms`);

    const check = () => {
      const handler = setTimeout(async () => {
        await Metrics.instance.asyncTimer(
          async () => this.conn.query('select 1').catch(err => log.warn('Problems querying sql event loop lag', err)),
          'sql.delay_ms',
          { schema: this.name }
        )();

        if (handler) {
          clearTimeout(handler);
        }

        check();
      }, frequencyMS);

      handler.unref();
    };

    if (isRemote) {
      check();
    } else {
      log.warn('Not running sql stats on local box, only enabled on remote machines');
    }
  }
}
