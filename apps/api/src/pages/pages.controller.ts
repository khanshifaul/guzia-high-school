// src/pages/pages.controller.ts — public page content. One route: the page the
// public site fetches, published blocks only. Shape mirrors `notices/public`.
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PagesService } from './pages.service';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
    constructor(private readonly service: PagesService) {}

    @Public()
    @Get(':slug')
    @ApiOperation({ summary: 'Published blocks of a public page, both languages' })
    get(@Param('slug') slug: string) {
        return this.service.getPublished(slug);
    }
}
