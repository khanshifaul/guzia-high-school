// src/admissions/admissions.module.ts
import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';

@Module({
    imports: [EmailModule],
    controllers: [AdmissionsController],
    providers: [AdmissionsService],
    exports: [AdmissionsService],
})
export class AdmissionsModule {}
