// src/ai/sources/sources.controller.ts — teacher source endpoints.
// Upload is text-based for now (extracted upstream); the multer + unpdf/vision
// ingestion step wires in here (spec 10 Feature C).
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { SourcesService } from './sources.service';

@ApiTags('AI Sources')
@Controller('ai/sources')
export class SourcesController {
    constructor(private readonly service: SourcesService) {}

    @Roles('TEACHER')
    @Get()
    list(@User() user: { id: string }) {
        return this.service.list(user.id);
    }

    @Roles('TEACHER')
    @Get(':id')
    get(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.get(id, user.id);
    }

    @Roles('TEACHER')
    @Post(':id/summarize')
    summarize(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.summarize(id, user.id);
    }

    @Roles('TEACHER')
    @Post(':id/ask')
    @ApiOperation({ summary: 'Ask a question about a source (page-cited)' })
    ask(
        @Param('id') id: string,
        @Body('question') question: string,
        @User() user: { id: string },
    ) {
        return this.service.ask(id, user.id, question);
    }

    @Roles('TEACHER')
    @Get(':id/chunks')
    chunks(@Param('id') id: string, @User() user: { id: string }, @Query('page') page?: string) {
        return this.service.get(id, user.id);
    }
}
