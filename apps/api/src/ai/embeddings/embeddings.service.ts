// src/ai/embeddings/embeddings.service.ts — text embeddings, one interface.
//
// Two providers behind the same embed()/embedOne():
//   local   Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384-dim, EN + BN),
//           in-process via transformers.js. The default: no key, no network.
//   nvidia  An OpenAI-compatible /embeddings endpoint
//           (nvidia/nemotron-3-embed-1b, 2048-dim).
//
// The provider decides the vector width, so it must match the
// `SourceChunk.embedding` column. Switching on a populated index is refused at
// boot instead of silently returning empty retrieval.
import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { DatabaseService } from '../../database/database.service';

const LOCAL_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const LOCAL_DIMENSIONS = 384;
/** nvidia/nemotron-3-embed-1b returns 2048 floats (measured). */
const REMOTE_DIMENSIONS = 2048;
const REMOTE_DEFAULT_URL = 'https://integrate.api.nvidia.com/v1';
const REMOTE_DEFAULT_MODEL = 'nvidia/nemotron-3-embed-1b';
const BATCH_SIZE = 64;
/** Batch-level concurrency: the local model is CPU-bound, the remote API is not. */
const LOCAL_CONCURRENCY = 2;
const REMOTE_CONCURRENCY = 4;
const EMPTY_TEXT_PLACEHOLDER = ' ';
const REQUEST_TIMEOUT_MS = 60_000;

type Provider = 'local' | 'nvidia';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
    /** Vector width for the active provider; matches the DB column. */
    readonly dimensions: number;

    private readonly logger = new Logger(EmbeddingsService.name);
    private readonly provider: Provider;
    private readonly remoteKey: string;
    private readonly remoteUrl: string;
    private readonly remoteModel: string;
    private extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: DatabaseService,
    ) {
        this.provider =
            this.config.get<string>('EMBEDDINGS_PROVIDER') === 'nvidia' ? 'nvidia' : 'local';
        this.remoteKey = this.config.get<string>('NVIDIA_API_KEY') ?? '';
        this.remoteUrl = (this.config.get<string>('NVIDIA_BASE_URL') ?? REMOTE_DEFAULT_URL).replace(/\/+$/, '');
        this.remoteModel = this.config.get<string>('NVIDIA_EMBED_MODEL') ?? REMOTE_DEFAULT_MODEL;
        this.dimensions = this.provider === 'nvidia' ? REMOTE_DIMENSIONS : LOCAL_DIMENSIONS;

        if (this.provider === 'nvidia' && !this.remoteKey) {
            throw new Error('EMBEDDINGS_PROVIDER=nvidia requires NVIDIA_API_KEY');
        }
    }

    /**
     * Refuse to boot when the index holds another provider's width: a 384-d
     * index and 2048-d queries cannot be compared, and the mismatch would
     * otherwise show up as silently empty retrieval.
     */
    async onModuleInit(): Promise<void> {
        const rows = await this.prisma.$queryRaw<{ dims: number }[]>`
            SELECT vector_dims(embedding) AS dims
            FROM "SourceChunk"
            WHERE embedding IS NOT NULL
            LIMIT 1
        `;
        const stored = rows[0]?.dims;
        if (typeof stored === 'number' && stored !== this.dimensions) {
            throw new Error(
                `EMBEDDINGS_PROVIDER=${this.provider} produces ${this.dimensions}-dim vectors, but ` +
                    `SourceChunk.embedding holds ${stored}-dim vectors. Switching providers needs the ` +
                    'column migrated to the new width and the old vectors cleared (then re-ingest/reindex).',
            );
        }
        this.logger.log(`Embeddings provider: ${this.provider} (${this.dimensions} dims)`);
    }

    /**
     * Embed a batch of texts; returns one vector per input, in input order.
     *
     * Identical normalized texts (headings, repeated table rows, overlapping
     * chunks) are embedded once and the vector is fanned back out to every
     * occurrence — the model call is the expensive part, the copy is not.
     */
    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        // Trim so the dedupe key is whitespace-insensitive (the tokenizer does
        // not see leading/trailing space anyway). Empty / whitespace-only
        // inputs would tokenize to nothing; substitute a single space so every
        // input still yields a valid vector.
        const normalized = texts.map((text) => {
            const trimmed = text.trim();
            return trimmed.length > 0 ? trimmed : EMPTY_TEXT_PLACEHOLDER;
        });

        const uniqueTexts: string[] = [];
        const indexByText = new Map<string, number>();
        const sourceIndex: number[] = [];
        for (const text of normalized) {
            let index = indexByText.get(text);
            if (index === undefined) {
                index = uniqueTexts.length;
                uniqueTexts.push(text);
                indexByText.set(text, index);
            }
            sourceIndex.push(index);
        }

        const uniqueVectors =
            this.provider === 'nvidia'
                ? await this.embedRemote(uniqueTexts)
                : await this.embedLocal(uniqueTexts);

        return sourceIndex.map((uniqueIndex) => uniqueVectors[uniqueIndex]);
    }

    /** Embed a single text. */
    async embedOne(text: string): Promise<number[]> {
        const [vector] = await this.embed([text]);
        return vector;
    }

    private async embedLocal(normalized: string[]): Promise<number[][]> {
        const extractor = await this.getExtractor();
        const batches = splitBatches(normalized);
        const results = await runPool(batches, LOCAL_CONCURRENCY, async (batch) => {
            const output = await extractor(batch, { pooling: 'mean', normalize: true });
            return output.tolist() as number[][];
        });
        return results.flat();
    }

    /** OpenAI-compatible /embeddings (NVIDIA's integrate.api.nvidia.com). */
    private async embedRemote(normalized: string[]): Promise<number[][]> {
        const batches = splitBatches(normalized);
        const results = await runPool(batches, REMOTE_CONCURRENCY, async (batch) => {
            const response = await fetch(`${this.remoteUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.remoteKey}`,
                },
                body: JSON.stringify({ model: this.remoteModel, input: batch }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!response.ok) {
                const detail = (await response.text()).slice(0, 200);
                throw new ServiceUnavailableException(
                    `Embedding provider returned ${response.status}: ${detail}`,
                );
            }

            const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
            const rows = payload.data ?? [];
            if (rows.length !== batch.length) {
                throw new ServiceUnavailableException(
                    `Embedding provider returned ${rows.length} vectors for ${batch.length} inputs`,
                );
            }
            return rows.map((row) => {
                const vector = row.embedding ?? [];
                if (vector.length !== this.dimensions) {
                    throw new ServiceUnavailableException(
                        `Embedding provider returned a ${vector.length}-dim vector; expected ${this.dimensions}`,
                    );
                }
                return vector;
            });
        });
        return results.flat();
    }

    private getExtractor(): Promise<FeatureExtractionPipeline> {
        if (!this.extractorPromise) {
            this.logger.log(`Loading embedding model ${LOCAL_MODEL} (first use)`);
            this.extractorPromise = pipeline('feature-extraction', LOCAL_MODEL).catch(
                (error: unknown) => {
                    // Allow a later call to retry after a failed download/load.
                    this.extractorPromise = null;
                    throw error;
                },
            );
        }
        return this.extractorPromise;
    }
}

/** Split into model batches of at most BATCH_SIZE inputs. */
function splitBatches(texts: string[]): string[][] {
    const batches: string[][] = [];
    for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
        batches.push(texts.slice(offset, offset + BATCH_SIZE));
    }
    return batches;
}

/** Run `worker` over `items` with at most `concurrency` in flight; order kept. */
async function runPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = [];
    let next = 0;

    const run = async (): Promise<void> => {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index]);
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
    );
    return results;
}
