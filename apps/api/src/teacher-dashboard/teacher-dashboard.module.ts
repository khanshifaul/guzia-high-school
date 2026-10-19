// src/teacher-dashboard/teacher-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TeacherDashboardController } from './teacher-dashboard.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Module({
  controllers: [TeacherDashboardController],
  providers: [TeacherDashboardService],
  exports: [TeacherDashboardService],
})
export class TeacherDashboardModule {}
