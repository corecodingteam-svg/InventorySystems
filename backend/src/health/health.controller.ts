import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'kysely';
import { KYSELY, Db } from '../database/database.module';

@Controller()
export class HealthController {
  constructor(@Inject(KYSELY) private db: Db) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await sql`select 1`.execute(this.db);
      return { status: 'ready', database: 'up' };
    } catch {
      return { status: 'not_ready', database: 'down' };
    }
  }
}
