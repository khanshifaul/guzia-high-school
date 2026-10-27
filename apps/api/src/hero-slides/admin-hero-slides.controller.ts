import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../prisma/generated/client';
import { HeroSlidesService } from './hero-slides.service';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';

@ApiTags('Admin - Hero Slides')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/hero-slides')
export class AdminHeroSlidesController {
  constructor(private readonly heroSlidesService: HeroSlidesService) {}

  @Get()
  @ApiOperation({ summary: 'List all hero slides' })
  findAll() {
    return this.heroSlidesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a hero slide' })
  create(@Body() dto: CreateHeroSlideDto) {
    return this.heroSlidesService.create(dto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder hero slides' })
  reorder(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.heroSlidesService.reorder(body.items || []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hero slide' })
  findOne(@Param('id') id: string) {
    return this.heroSlidesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hero slide' })
  update(@Param('id') id: string, @Body() dto: UpdateHeroSlideDto) {
    return this.heroSlidesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hero slide' })
  remove(@Param('id') id: string) {
    return this.heroSlidesService.remove(id);
  }
}
