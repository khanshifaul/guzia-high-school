// src/contact/contact.controller.ts — public submit + admin list/read.
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a contact-form message (public)' })
  create(@Body() dto: CreateContactDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  list() {
    return this.service.list();
  }

  @Roles('ADMIN')
  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}
