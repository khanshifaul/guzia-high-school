// src/health.controller.ts — liveness + DB reachability (compose healthcheck
// and demo sanity). Public, excluded from the /api prefix.
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { DatabaseService } from './database/database.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: DatabaseService) {}

  @Public()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ ok: false, database: 'down' });
    }
    return { ok: true, database: 'up' };
  }
}
