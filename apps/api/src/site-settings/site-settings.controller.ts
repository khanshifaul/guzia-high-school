// src/site-settings/site-settings.controller.ts — public read + admin write.
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public site info (name, EIIN, board, contact, socials, links)' })
  get() {
    return this.service.get();
  }

  @Roles('ADMIN')
  @Put()
  @ApiOperation({ summary: 'Update public site info' })
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.service.update(dto);
  }
}
