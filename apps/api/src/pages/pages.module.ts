// src/pages/pages.module.ts — public page content (public read + admin write).
import { Module } from '@nestjs/common';
import { AdminPagesController } from './admin-pages.controller';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
    controllers: [PagesController, AdminPagesController],
    providers: [PagesService],
    exports: [PagesService],
})
export class PagesModule {}
