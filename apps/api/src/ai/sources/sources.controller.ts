// src/ai/sources/sources.controller.ts — teacher source endpoints.
// Upload is text-based for now (extracted upstream); the multer + unpdf/vision
// ingestion step wires in here (spec 10 Feature C).
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUrl, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { SourcesService } from './sources.service';
import { UploadService } from '../../upload/upload.service';
import { RateLimit } from '../../common/rate-limiter/rate-limit.guard';

class IngestSourceDto {
    @ApiProperty({ example: 'ch3-algebra.txt' })
    @IsString()
    @Length(1, 200)
    filename: string;

    @ApiProperty({ enum: ['PDF', 'IMAGE'] })
    @IsIn(['PDF', 'IMAGE'])
    kind: 'PDF' | 'IMAGE';

    @ApiProperty({ description: 'Full extracted text of the source' })
    @IsString()
    @Length(1, 200000)
    text: string;

    @ApiPropertyOptional({ description: 'Class this source belongs to' })
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional({ description: 'Subject this source belongs to' })
    @IsOptional()
    @IsString()
    subjectId?: string;
}

class FromUrlDto {
    @ApiProperty({ example: 'https://www.nctb.gov.bd/site/page/...' })
    @IsUrl({ require_tld: false })
    url: string;

    @ApiPropertyOptional({ description: 'Class this source belongs to' })
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional({ description: 'Subject this source belongs to' })
    @IsOptional()
    @IsString()
    subjectId?: string;
}

class AskTurnDto {
    @ApiProperty({ enum: ['user', 'assistant'] })
    @IsIn(['user', 'assistant'])
    role: 'user' | 'assistant';

    @ApiProperty()
    @IsString()
    @Length(1, 4000)
    content: string;
}

class AskSourcesDto {
    @ApiProperty({ example: 'Explain the causes of the 1857 rebellion.' })
    @IsString()
    @Length(1, 500)
    question: string;

    @ApiPropertyOptional({ description: 'Only search sources for this class' })
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional({ description: 'Only search sources for this subject' })
    @IsOptional()
    @IsString()
    subjectId?: string;

    @ApiPropertyOptional({
        description: 'Prior conversation turns, oldest first (max 10)',
        type: [AskTurnDto],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => AskTurnDto)
    history?: AskTurnDto[];
}

@ApiTags('AI Sources')
@Controller('ai/sources')
export class SourcesController {
    constructor(
        private readonly service: SourcesService,
        private readonly uploadService: UploadService,
    ) {}

    @Roles('TEACHER')
    @Get()
    list(@User() user: { id: string }) {
        return this.service.list(user.id);
    }

    @Roles('TEACHER')
    @Post('upload')
    @RateLimit('ai:upload', 60_000, 5)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
    @ApiOperation({ summary: 'Upload a PDF/text file → store (R2/local), extract, summarize' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                filename: { type: 'string' },
                kind: { type: 'string', enum: ['PDF', 'IMAGE'] },
                classId: { type: 'string' },
                subjectId: { type: 'string' },
            },
        },
    })
    async uploadSource(
        @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
        @Body('classId') classId: string | undefined,
        @Body('subjectId') subjectId: string | undefined,
        @User() user: { id: string },
    ) {
        return this.service.ingestUpload(user.id, file, classId, subjectId);
    }

    @Roles('TEACHER')
    @Post('from-url')
    @RateLimit('ai:upload', 60_000, 5)
    @ApiOperation({ summary: 'Ingest a web page by URL (http/https)' })
    fromUrl(@Body() dto: FromUrlDto, @User() user: { id: string }) {
        return this.service.ingestUrl(user.id, dto.url, dto.classId, dto.subjectId);
    }

    @Roles('TEACHER')
    @Post('ingest')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Ingest source text, chunk + auto-summarize' })
    ingest(@Body() dto: IngestSourceDto, @User() user: { id: string }) {
        return this.service.ingest({
            userId: user.id,
            filename: dto.filename,
            kind: dto.kind,
            pages: [{ page: 1, text: dto.text }],
            classId: dto.classId,
            subjectId: dto.subjectId,
        });
    }

    @Roles('TEACHER')
    @Post('ask')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: "Ask across all of a teacher's sources (page-cited)" })
    askAll(@Body() dto: AskSourcesDto, @User() user: { id: string }) {
        return this.service.askNotebook(user.id, dto.question, dto.classId, dto.subjectId, dto.history);
    }

    @Roles('TEACHER')
    @Post('reindex')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Embed source chunks that are missing vectors (backfill)' })
    reindex(@User() user: { id: string }) {
        return this.service.reindex(user.id);
    }

    @Roles('TEACHER')
    @Get(':id')
    get(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.get(id, user.id);
    }

    @Roles('TEACHER')
    @Post(':id/summarize')
    @RateLimit('ai:generate', 60_000, 10)
    summarize(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.summarize(id, user.id);
    }

    @Roles('TEACHER')
    @Post(':id/ask')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Ask a question about a source (page-cited)' })
    ask(
        @Param('id') id: string,
        @Body('question') question: string,
        @User() user: { id: string },
    ) {
        return this.service.ask(id, user.id, question);
    }

    @Roles('TEACHER')
    @Post(':id/ocr')
    @RateLimit('ai:generate', 60_000, 5)
    @ApiOperation({ summary: 'Transcribe a scanned PDF with OCR, then embed + summarize it' })
    ocr(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.ocr(id, user.id);
    }

    @Roles('TEACHER')
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a source (chunks + stored file)' })
    remove(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.remove(user.id, id);
    }

    @Roles('TEACHER')
    @Get(':id/chunks')
    chunks(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.get(id, user.id);
    }
}
