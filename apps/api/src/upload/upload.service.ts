// src/upload/upload.service.ts — file storage for images & documents.
// Uses an S3-compatible object store (Backblaze B2, Cloudflare R2, MinIO, …)
// when configured; falls back to local disk under uploads/ so the offline
// demo still works end-to-end.
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
    storage: 's3' | 'local';
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
        // Generic S3-compatible config. The legacy CF_R2_* vars are honored as a
        // fallback when the STORAGE_* vars are unset.
        const accountId = this.config.get<string>('CF_ACCOUNT_ID');
        const r2Endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;

        const endpoint = this.config.get<string>('STORAGE_ENDPOINT') ?? r2Endpoint;
        const region = this.config.get<string>('STORAGE_REGION') ?? 'auto';
        const accessKeyId =
            this.config.get<string>('STORAGE_ACCESS_KEY_ID') ?? this.config.get<string>('CF_R2_ACCESS_KEY_ID');
        const secretAccessKey =
            this.config.get<string>('STORAGE_SECRET_ACCESS_KEY') ?? this.config.get<string>('CF_R2_SECRET_ACCESS_KEY');
        // Backblaze B2 requires path-style addressing; R2 accepts it too.
        const forcePathStyle = this.config.get<string>('STORAGE_FORCE_PATH_STYLE') === 'true';

        this.bucket =
            this.config.get<string>('STORAGE_BUCKET') ??
            this.config.get<string>('CF_R2_BUCKET_NAME') ??
            'guzia-uploads';
        // Explicit public base URL only (e.g. an R2/CDN domain). Otherwise files
        // are served through the authenticated /api/files/:key route.
        this.publicBase =
            this.config.get<string>('STORAGE_PUBLIC_URL') ??
            this.config.get<string>('CF_R2_PUBLIC_URL') ??
            '';
        this.localDir = resolve(process.cwd(), 'uploads');

        if (endpoint && accessKeyId && secretAccessKey) {
            this.client = new S3Client({
                region,
                endpoint,
                credentials: { accessKeyId, secretAccessKey },
                forcePathStyle,
            });
            this.logger.log(`Object storage configured (${endpoint})`);
        } else {
            this.client = null;
            this.logger.warn('Object storage not configured — falling back to local disk uploads/');
        }
    }

    get usingRemoteStorage(): boolean {
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
                url: this.publicBase ? `${this.publicBase.replace(/\/$/, '')}/${key}` : `/api/files/${key}`,
                size: buffer.byteLength,
                contentType,
                storage: 's3',
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
