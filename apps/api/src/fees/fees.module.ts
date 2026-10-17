// src/fees/fees.module.ts
import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesModuleService } from './fees.service';

@Module({
    controllers: [FeesController],
    providers: [FeesModuleService],
    exports: [FeesModuleService],
})
export class FeesModule {}
