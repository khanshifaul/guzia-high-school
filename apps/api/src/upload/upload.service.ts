// src/upload/upload.service.ts — file storage for images & documents.
// Uses Cloudflare R2 (S3-compatible) when configured; falls back to local
// disk under uploads/ so the offline demo still works end-to-end.
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

export interface StoredFile {
    key: string;
    url: string;
    size: number;
    contentType: string;
    storage: 'r2' | 'local';
}

const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
]);
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly client: S3Client | null;
    private readonly bucket: string;
    private readonly publicBase: string;
    private readonly localDir: string;

    constructor(private readonly config: ConfigService) {
        const accountId = this.config.get<string>('CF_ACCOUNT_ID');
        const accessKeyId = this.config.get<string>('CF_R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get<string>('CF_R2_SECRET_ACCESS_KEY');
        this.bucket = this.config.get<string>('CF_R2_BUCKET_NAME') ?? 'guzia-uploads';
        this.publicBase =
            this.config.get<string>('CF_R2_PUBLIC_URL') ??
            (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
        this.localDir = resolve(process.cwd(), 'uploads');

        if (accountId && accessKeyId && secretAccessKey) {
            this.client = new S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: { accessKeyId, secretAccessKey },
            });
            this.logger.log('R2 storage configured');
        } else {
            this.client = null;
            this.logger.warn('R2 not configured — falling back to local disk uploads/');
        }
    }

    get usingR2(): boolean {
        return this.client !== null;
    }

    /** Store a file. Validates type + size, then writes to R2 or local disk. */
    async storeFile(
        buffer: Buffer,
        originalName: string,
        contentType: string,
        folder = 'sources',
    ): Promise<StoredFile> {
        if (!ALLOWED_MIME.has(contentType)) {
            throw new BadRequestException(`Unsupported file type: ${contentType}`);
        }
        if (buffer.byteLength > MAX_BYTES) {
            throw new BadRequestException('File exceeds the 15 MB limit');
        }

        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${folder}/${randomUUID()}-${safeName}`;

        if (this.client) {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                }),
            );
            return {
                key,
                url: `${this.publicBase}/${this.bucket}/${key}`,
                size: buffer.byteLength,
                contentType,
                storage: 'r2',
            };
        }

        // Local-disk fallback.
        await mkdir(this.localDir, { recursive: true });
        const path = join(this.localDir, key.replace(/\//g, '_'));
        await new Promise<void>((res, rej) => {
            const ws = createWriteStream(path);
            ws.on('finish', () => res());
            ws.on('error', rej);
            ws.end(buffer);
        });
        return {
            key,
            url: `/api/files/${key}`,
            size: buffer.byteLength,
            contentType,
            storage: 'local',
        };
    }

    /** Stream a stored file back (used by the /files/:key download route). */
    async getFile(key: string, _contentType: string): Promise<Readable> {
        if (this.client) {
            const res = await this.client.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            );
            if (!res.Body) throw new ServiceUnavailableException('Empty object body');
            return res.Body as Readable;
        }

        // Local: the key maps to a flattened filename.
        const path = join(this.localDir, key.replace(/\//g, '_'));
        try {
            await stat(path);
        } catch {
            throw new ServiceUnavailableException('File not found');
        }
        const buf = await readFile(path);
        return Readable.from(buf);
    }

    /** Guess a content type from the key extension (for local downloads). */
    contentTypeFor(key: string): string {
        const ext = key.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return 'application/pdf';
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'webp': return 'image/webp';
            default: return 'application/octet-stream';
        }
    }
}
