import { HealthCheck } from '@paradoxical-io/common-server';
import { DataSource } from 'typeorm';

export class DbHealth implements HealthCheck {
  constructor(private conn: DataSource) {}

  async healthCheck(): Promise<boolean> {
    // if the migrations query succeeds, we are connected and passing
    await this.conn.showMigrations();

    return true;
  }
}
