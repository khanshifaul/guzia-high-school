// src/pages/admin-pages.controller.ts — admin edits page content. Every route
// is ADMIN-only (class-level @Roles); the public route lives in
// pages.controller.ts so a single decorator decides what an anonymous caller
// may see.
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateBlockDto, ReorderBlocksDto, UpdateBlockDto, UpdatePageDto } from './dto';
import { PagesService } from './pages.service';

@ApiTags('Pages (admin)')
@Roles('ADMIN')
@Controller('admin/pages')
export class AdminPagesController {
    constructor(private readonly service: PagesService) {}

    @Get()
    @ApiOperation({ summary: 'List pages with their blocks (published and unpublished)' })
    list() {
        return this.service.adminList();
    }

    @Get(':slug')
    @ApiOperation({ summary: 'One page with every block, for the editor' })
    get(@Param('slug') slug: string) {
        return this.service.adminGet(slug);
    }

    @Patch(':slug')
    @ApiOperation({ summary: 'Update a page title or publish state' })
    update(@Param('slug') slug: string, @Body() dto: UpdatePageDto) {
        return this.service.updatePage(slug, dto);
    }

    @Post(':slug/blocks')
    @ApiOperation({ summary: 'Add a block to a page' })
    createBlock(@Param('slug') slug: string, @Body() dto: CreateBlockDto) {
        return this.service.createBlock(slug, dto);
    }

    @Post(':slug/blocks/reorder')
    @ApiOperation({ summary: 'Set the page order from the full list of block ids' })
    reorder(@Param('slug') slug: string, @Body() dto: ReorderBlocksDto) {
        return this.service.reorder(slug, dto);
    }

    @Patch(':slug/blocks/:blockId')
    @ApiOperation({ summary: 'Update a block body, image, link or publish state' })
    updateBlock(
        @Param('slug') slug: string,
        @Param('blockId') blockId: string,
        @Body() dto: UpdateBlockDto,
    ) {
        return this.service.updateBlock(slug, blockId, dto);
    }

    @Delete(':slug/blocks/:blockId')
    @ApiOperation({ summary: 'Delete a block from a page' })
    deleteBlock(@Param('slug') slug: string, @Param('blockId') blockId: string) {
        return this.service.deleteBlock(slug, blockId);
    }
}
