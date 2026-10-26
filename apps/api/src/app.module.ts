// src/app.module.ts — app wiring: env validation at boot, global DB,
// auth module, global guards (auth first, then roles, then rate limit),
// health route.
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
import { WorkspacesModule } from './workspaces/workspaces.module';
import { EmailModule } from './email/email.module';
import { ContactModule } from './contact/contact.module';
import { GalleryModule } from './gallery/gallery.module';
import { PagesModule } from './pages/pages.module';
import { AccessTokenGuard } from './common/guards/access-token.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/rate-limiter/rate-limit.guard';
import { HealthController } from './health.controller';
import { AccessModule } from './common/access/access.module';
import { TeacherDashboardModule } from './teacher-dashboard/teacher-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    AccessModule,
    TeacherDashboardModule,
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
    WorkspacesModule,
    EmailModule,
    ContactModule,
    GalleryModule,
    PagesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
