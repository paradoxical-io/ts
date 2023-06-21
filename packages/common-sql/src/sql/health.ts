import { HealthCheck } from '@paradoxical-io/common-server';
import { Connection } from 'typeorm';

export class DbHealth implements HealthCheck {
  constructor(private conn: Connection) {}

  async healthCheck(): Promise<boolean> {
    // if the migrations query succeeds, we are connected and passing
    await this.conn.showMigrations();

    return true;
  }
}
