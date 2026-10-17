// src/app.module.ts — app wiring: env validation at boot, global DB,
// auth module, global guards (auth first, then roles), health route.
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamsModule } from './exams/exams.module';
import { FeesModule } from './fees/fees.module';
import { TeachersModule } from './teachers/teachers.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { NoticesModule } from './notices/notices.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './upload/upload.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { AccessTokenGuard } from './common/guards/access-token.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    ClassesModule,
    StudentsModule,
    AttendanceModule,
    ExamsModule,
    FeesModule,
    TeachersModule,
    AssignmentsModule,
    AdmissionsModule,
    NoticesModule,
    AiModule,
    UploadModule,
    SiteSettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
