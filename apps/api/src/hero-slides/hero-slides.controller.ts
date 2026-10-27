import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HeroSlidesService } from './hero-slides.service';

@ApiTags('Hero Slides')
@Controller('hero-slides')
export class HeroSlidesController {
  constructor(private readonly heroSlidesService: HeroSlidesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get published hero slides for the homepage' })
  findAll() {
    return this.heroSlidesService.findAllPublic();
  }
}
