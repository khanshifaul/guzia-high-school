// src/ai/embeddings/embeddings.service.ts — local sentence embeddings.
// Runs Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384-dim, English + Bangla)
// in-process via transformers.js. The
// pipeline is loaded lazily on first use so Nest boots without paying the
// model-load cost (and without network access being required at startup).
import { Injectable, Logger } from '@nestjs/common';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const BATCH_SIZE = 32;
const EMPTY_TEXT_PLACEHOLDER = ' ';

@Injectable()
export class EmbeddingsService {
    /** Multilingual MiniLM hidden size; matches the `vector(384)` column. */
    readonly dimensions = 384;

    private readonly logger = new Logger(EmbeddingsService.name);
    private extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

    /** Embed a batch of texts; returns one 384-dim vector per input. */
    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        // Empty / whitespace-only inputs would tokenize to nothing; substitute a
        // single space so every input still yields a valid vector.
        const normalized = texts.map((text) =>
            text.trim().length > 0 ? text : EMPTY_TEXT_PLACEHOLDER,
        );

        const extractor = await this.getExtractor();
        const vectors: number[][] = [];
        for (let offset = 0; offset < normalized.length; offset += BATCH_SIZE) {
            const batch = normalized.slice(offset, offset + BATCH_SIZE);
            const output = await extractor(batch, { pooling: 'mean', normalize: true });
            vectors.push(...(output.tolist() as number[][]));
        }
        return vectors;
    }

    /** Embed a single text. */
    async embedOne(text: string): Promise<number[]> {
        const [vector] = await this.embed([text]);
        return vector;
    }

    private getExtractor(): Promise<FeatureExtractionPipeline> {
        if (!this.extractorPromise) {
            this.logger.log(`Loading embedding model ${MODEL_ID} (first use)`);
            this.extractorPromise = pipeline('feature-extraction', MODEL_ID).catch(
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
