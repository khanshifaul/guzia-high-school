// src/database/database.service.ts — slimmed from zylosync's DatabaseService:
// same lifecycle + PrismaPg adapter shape, minus tenancy/replica layers.
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(configService: ConfigService) {
    const writeUrl = configService.get<string>('DATABASE_URL');
    if (!writeUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const adapter = new PrismaPg({ connectionString: writeUrl });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected (Prisma + pg adapter)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
