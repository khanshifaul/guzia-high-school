// src/upload/upload.controller.ts — file upload + download endpoints.
// POST /upload (multipart) stores to R2 (or local disk) and returns the URL;
// GET /files/:key streams a stored file back.
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Res,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller()
export class UploadController {
    constructor(private readonly upload: UploadService) {}

    @Roles('ADMIN', 'TEACHER', 'STUDENT')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
    @ApiOperation({ summary: 'Upload an image or document (R2 or local disk)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                folder: { type: 'string', description: 'Optional storage folder' },
            },
        },
    })
    async uploadFile(
        @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
        @Body('folder') folder?: string,
    ) {
        if (!file) {
            return { error: 'No file provided (use form field "file")' };
        }
        const stored = await this.upload.storeFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            folder || 'uploads',
        );
        return { ...stored, usingR2: this.upload.usingR2 };
    }

    @Public()
    @Get('files/*key')
    @ApiOperation({ summary: 'Download a stored file' })
    async download(@Param('key') key: string | string[], @Res() res: Response) {
        // The key contains slashes (e.g. sources/uuid-file.txt); the wildcard
        // param arrives as a segment array on Express 5. Rejoin + decode.
        const raw = Array.isArray(key) ? key.join('/') : key;
        const fullKey = decodeURIComponent(raw);
        const contentType = this.upload.contentTypeFor(fullKey);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${fullKey.split('/').pop() ?? 'file'}"`);
        const stream = await this.upload.getFile(fullKey, contentType);
        stream.pipe(res);
    }
}
