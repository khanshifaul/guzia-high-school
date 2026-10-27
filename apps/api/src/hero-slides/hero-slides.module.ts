import { Module } from '@nestjs/common';
import { HeroSlidesService } from './hero-slides.service';
import { HeroSlidesController } from './hero-slides.controller';
import { AdminHeroSlidesController } from './admin-hero-slides.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HeroSlidesController, AdminHeroSlidesController],
  providers: [HeroSlidesService],
  exports: [HeroSlidesService],
})
export class HeroSlidesModule {}
