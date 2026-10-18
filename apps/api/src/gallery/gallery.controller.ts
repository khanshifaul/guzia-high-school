// src/gallery/gallery.controller.ts — public list + admin CRUD.
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GalleryService } from './gallery.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';

@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private readonly service: GalleryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List gallery images (public)' })
  list() {
    return this.service.list();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateGalleryItemDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateGalleryItemDto>) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
