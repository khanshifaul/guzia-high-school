// scripts/bench-rag.ts — measure the real RAG ingest/retrieval pipeline.
//
// Runs against the local compose Postgres only (it refuses any other host):
//
//   DATABASE_URL=postgresql://ghs:ghs_dev_password@localhost:5434/ghs \
//     bun apps/api/scripts/bench-rag.ts
//
// For each fixture in test/fixtures/rag/ it times extract → chunk → insert →
// embed, then seeds a deterministic corpus (the four fixtures plus synthetic
// chunks) and times the keyword arm, the vector arm and RRF fusion, the hybrid
// retrieve path cold and warm, the quality guard (top-3 hit rate), and a
// second ingest pass (re-ingest idempotency).
//
// The image fixture's vision call is stubbed with page.png.txt: no network
// model is called, so the number is reproducible offline. Everything else is
// the same code the upload path runs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../src/database/database.service';
import { EmbeddingsService } from '../src/ai/embeddings/embeddings.service';
import { fuseHits, RetrievalService } from '../src/ai/sources/retrieval.service';
import { chunkPages, contentHashOf } from '../src/ai/sources/chunk.util';
import { extractPages, type ExtractPath } from '../src/ai/sources/extract.util';
import { stripRunningHeads } from '../src/ai/sources/text-clean.util';

const DEFAULT_URL = 'postgresql://ghs:ghs_dev_password@localhost:5434/ghs';
const FIXTURES = join(import.meta.dir, '../test/fixtures/rag');
const QUESTIONS = join(FIXTURES, 'questions.json');

const BENCH_USER_ID = 'bench-rag-user';
const BENCH_TEACHER_ID = 'bench-rag-teacher';
/** Total embedded chunks the corpus is padded to (the keyword arm needs ≥500). */
const EMBEDDED_CORPUS = 520;
/** Keyword-only rows: no vector, so the corpus is big enough to price the scan. */
const KEYWORD_ONLY_CORPUS = 2480;
const QUESTIONS_PER_PASS = 3;
const ARM_LIMIT = 20;

interface FixtureSpec {
    file: string;
    base: string;
    path: ExtractPath;
    mime: string;
}

const FIXTURE_SPECS: FixtureSpec[] = [
    { file: 'multi-page.pdf', base: 'multi-page', path: 'pdf', mime: 'application/pdf' },
    { file: 'notes.docx', base: 'notes', path: 'office', mime: 'application/octet-stream' },
    { file: 'marks.csv', base: 'marks', path: 'text', mime: 'text/csv' },
    { file: 'page.png', base: 'page', path: 'image', mime: 'image/png' },
];

interface Question {
    question: string;
    expected: string[];
}

interface StageRow {
    fixture: string;
    pages: number;
    chunks: number;
    chars: number;
    extractMs: number;
    chunkMs: number;
    insertMs: number;
    embedMs: number;
}

function median(values: number[]): number {
    return percentile(values, 50);
}

function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index];
}

async function timeIt<T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> {
    const started = performance.now();
    const value = await work();
    return { value, ms: performance.now() - started };
}

function pad(text: string, width: number): string {
    return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function number(value: number, digits = 1): string {
    return value.toFixed(digits);
}

/**
 * Eight distinct lesson pages used as the first pad chunks. They must not
 * overlap the four fixtures (a question must have one right chunk) and must be
 * semantically distinct from each other so the vector arm is stable.
 */
const PAD_TOPICS: string[] = [
    'Library Rules. A student may borrow one book at a time for fourteen days. ' +
        'Reference books and magazines are read in the reading room only. ' +
        'A book returned late carries a fine of two taka per day. ' +
        'Lost books must be replaced with the same title. ' +
        'The librarian issues library cards in the first week of January.',
    'Annual Sports Day. The annual sports day is held on the third Friday of February. ' +
        'Events include sprint races, relay races, long jump and tug of war. ' +
        'Each class enters a team of twelve students. ' +
        'The chief guest distributes medals and certificates after the final relay. ' +
        'Practice starts two weeks before the event on the school field.',
    'Examination Rules. Students must bring their admit card and a blue pen to the exam hall. ' +
        'No mobile phone, smart watch or printed notes are allowed inside. ' +
        'Candidates should reach the hall fifteen minutes before the bell. ' +
        'Answers written in pencil are not accepted except on diagrams. ' +
        'Any malpractice leads to cancellation of the paper.',
    'First Aid. When a student faints, lay them on their back in the shade and raise the legs. ' +
        'Loosen tight clothing and check that the airway is clear. ' +
        'Cool a burn with clean running water for ten minutes, never with ice. ' +
        'Press a clean cloth on a bleeding cut until the bleeding stops. ' +
        'Report every injury to the duty teacher immediately.',
    'Computer Basics. The central processing unit carries out the instructions of a program. ' +
        'Random access memory holds the work in progress and is cleared when power goes off. ' +
        'The hard disk stores files permanently. ' +
        'An operating system manages the hardware and lets applications run. ' +
        'Always shut the computer down properly before switching it off.',
    'Rivers of Bangladesh. The Padma, the Meghna and the Jamuna join to form the largest delta in the world. ' +
        'The Padma carries the combined flow of the Ganges and the Brahmaputra. ' +
        'Silt carried by the rivers makes the floodplain fertile for rice. ' +
        'During the monsoon the rivers swell and can flood low land. ' +
        'Ferries and launches carry people across them every day.',
    'Parts of Speech. A conjunction joins words, phrases or clauses, as and, but and because do. ' +
        'A noun names a person, place or thing. ' +
        'An adjective describes a noun, and an adverb describes a verb. ' +
        'A preposition shows the relation of a noun to another word. ' +
        'A pronoun stands in place of a noun to avoid repetition.',
    'Food and Nutrition. Protein from lentils, fish, eggs and milk builds muscle and repairs the body. ' +
        'Rice and bread supply carbohydrate for energy. ' +
        'Fruit and vegetables provide vitamins and fibre. ' +
        'Growing children need three balanced meals a day. ' +
        'Drinking clean water prevents dehydration in hot weather.',
];

/** Deterministic synthetic corpus text: every row is distinct (unique token). */
function syntheticChunk(index: number, token: string, length = 1200): string {
    const sentence =
        'The school library keeps a copy of every prescribed textbook for the year. ' +
        'Students may borrow one book at a time and must return it within a fortnight. ' +
        'The reading room is open from nine in the morning until four in the afternoon. ';
    const head = `Reference ${token} belongs to shelf ${index % 40} of the library catalogue. `;
    let text = head;
    while (text.length < length) text += sentence;
    return text.slice(0, length);
}

function assertLocalDatabase(): URL {
    const raw = process.env.DATABASE_URL ?? DEFAULT_URL;
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        console.error('DATABASE_URL is not a valid URL.');
        process.exit(2);
    }
    const host = parsed.hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        console.error(
            `Refusing to run: DATABASE_URL host is "${host}", not a local Postgres. ` +
                'The bench only writes to localhost:5434/ghs.',
        );
        process.exit(2);
    }
    return parsed;
}

async function main(): Promise<void> {
    const url = assertLocalDatabase();
    process.env.DATABASE_URL = url.toString();

    const config = new ConfigService({ DATABASE_URL: url.toString() });
    const prisma = new DatabaseService(config);
    const embeddings = new EmbeddingsService(config, prisma);

    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'SourceChunk'
    `;
    const hasContentHash = columns.some((column) => column.column_name === 'contentHash');
    const hasSearchVector = columns.some((column) => column.column_name === 'searchVector');

    console.log(
        `Bench database: ${url.hostname}:${url.port || '5432'}${url.pathname} · ` +
            `provider local (${embeddings.dimensions}d) · ` +
            `contentHash=${hasContentHash ? 'yes' : 'no'} searchVector=${hasSearchVector ? 'yes' : 'no'}`,
    );

    // Fixed bench identity; the teacher row is the FK every bench document needs.
    await prisma.user.upsert({
        where: { email: 'bench-rag@local.invalid' },
        update: {},
        create: {
            id: BENCH_USER_ID,
            email: 'bench-rag@local.invalid',
            passwordHash: 'not-a-login',
            fullName: 'RAG Bench',
            role: 'TEACHER',
        },
    });
    await prisma.teacher.upsert({
        where: { employeeId: 'BENCH-RAG' },
        update: {},
        create: { id: BENCH_TEACHER_ID, userId: BENCH_USER_ID, employeeId: 'BENCH-RAG' },
    });

    // A fresh corpus every run: the same bench twice must not measure duplicates.
    await prisma.sourceDocument.deleteMany({ where: { id: { startsWith: 'bench-doc:' } } });
    // Deleted rows leave dead HNSW entries behind; rebuild so the ANN graph is
    // built from the corpus this run actually seeds.
    await prisma.$executeRawUnsafe('REINDEX INDEX "SourceChunk_embedding_idx"');

    const stageRows: StageRow[] = [];
    const chunkRows: {
        id: string;
        content: string;
        documentId: string;
        contentHash?: string;
    }[] = [];

    const imageText = readFileSync(join(FIXTURES, 'page.png.txt'), 'utf8');

    for (const spec of FIXTURE_SPECS) {
        const buffer = readFileSync(join(FIXTURES, spec.file));
        const docId = `bench-doc:${spec.base}`;
        await prisma.sourceDocument.create({
            data: {
                id: docId,
                teacherId: BENCH_TEACHER_ID,
                filename: spec.file,
                kind: spec.path === 'image' ? 'IMAGE' : 'PDF',
                status: 'PROCESSING',
            },
        });

        const extracted = await timeIt(() =>
            extractPages(
                { buffer, originalname: spec.file, mimetype: spec.mime },
                spec.path,
                {
                    transcribeImage: async () => imageText,
                    convertDocument: async () => null,
                },
            ),
        );
        const chunked = await timeIt(async () =>
            chunkPages(stripRunningHeads(extracted.value)),
        );
        const chunks = chunked.value;

        const rows = chunks.map((chunk, index) => ({
            id: `bench:${spec.base}:${index}`,
            documentId: docId,
            page: chunk.page,
            content: chunk.text,
            ...(hasContentHash ? { contentHash: contentHashOf(chunk.text) } : {}),
        }));

        const inserted = await timeIt(() =>
            prisma.sourceChunk.createMany({ data: rows, skipDuplicates: hasContentHash }),
        );

        const created = rows.map((row) => ({
            id: row.id,
            content: row.content,
            documentId: row.documentId,
            contentHash: hasContentHash ? contentHashOf(row.content) : null,
        }));
        const embedded = await timeIt(() => new RetrievalService(prisma, embeddings).embedChunks(created));

        chunkRows.push(...created);
        stageRows.push({
            fixture: spec.file,
            pages: extracted.value.length,
            chunks: chunks.length,
            chars: chunks.reduce((sum, chunk) => sum + chunk.text.length, 0),
            extractMs: extracted.ms,
            chunkMs: chunked.ms,
            insertMs: inserted.ms,
            embedMs: embedded.ms,
        });
    }

    // Pad the embedded corpus to EMBEDDED_CORPUS chunks.
    const padDocId = 'bench-doc:pad';
    await prisma.sourceDocument.create({
        data: {
            id: padDocId,
            teacherId: BENCH_TEACHER_ID,
            filename: 'synthetic-pad.txt',
            kind: 'PDF',
            status: 'PROCESSING',
        },
    });
    const padCount = Math.max(0, EMBEDDED_CORPUS - chunkRows.length);
    const padRows = Array.from({ length: padCount }, (_, index) => {
        const topic = PAD_TOPICS[index];
        const text = topic
            ? `${topic} Reference page pad${String(index).padStart(2, '0')}.`
            : syntheticChunk(index, `zq${String(index).padStart(4, '0')}`);
        return {
            id: `bench:pad:${index}`,
            documentId: padDocId,
            page: 1,
            content: text,
            contentHash: contentHashOf(text),
        };
    });
    await prisma.sourceChunk.createMany({
        data: hasContentHash
            ? padRows
            : padRows.map(({ contentHash: _hash, ...row }) => row),
        skipDuplicates: hasContentHash,
    });
    const padEmbedded = await timeIt(() =>
        new RetrievalService(prisma, embeddings).embedChunks(
            padRows.map((row) => ({
                id: row.id,
                content: row.content,
                documentId: row.documentId,
                contentHash: hasContentHash ? row.contentHash : null,
            })),
        ),
    );
    chunkRows.push(...padRows);

    // Keyword-only rows: the keyword arm does not need a vector, and a corpus
    // this size is where the difference between a scan and a GIN index shows.
    const stressDocId = 'bench-doc:stress';
    await prisma.sourceDocument.create({
        data: {
            id: stressDocId,
            teacherId: BENCH_TEACHER_ID,
            filename: 'synthetic-keyword.txt',
            kind: 'PDF',
            status: 'PROCESSING',
        },
    });
    const stressRows = Array.from({ length: KEYWORD_ONLY_CORPUS }, (_, index) => {
        const text = syntheticChunk(index, `kw${String(index).padStart(5, '0')}`, 800);
        return {
            id: `bench:stress:${index}`,
            documentId: stressDocId,
            page: 1,
            content: text,
            ...(hasContentHash ? { contentHash: contentHashOf(text) } : {}),
        };
    });
    await timeIt(() =>
        prisma.sourceChunk.createMany({ data: stressRows, skipDuplicates: hasContentHash }),
    );

    const questions: Question[] = JSON.parse(readFileSync(QUESTIONS, 'utf8'));
    const corpusSize = chunkRows.length + stressRows.length;

    // ---- stage table -------------------------------------------------------
    console.log('');
    console.log(`## Ingest stages (fixtures; corpus = ${corpusSize} chunks)`);
    console.log('');
    console.log(
        '| fixture | pages | chunks | chars | extract ms | chunk ms | insert ms | embed ms | chunks/s |',
    );
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const row of stageRows) {
        const rate = row.embedMs > 0 ? (row.chunks * 1000) / row.embedMs : 0;
        console.log(
            `| ${pad(row.fixture, 14)} | ${row.pages} | ${row.chunks} | ${row.chars} | ` +
                `${number(row.extractMs)} | ${number(row.chunkMs)} | ${number(row.insertMs)} | ` +
                `${number(row.embedMs)} | ${number(rate, 2)} |`,
        );
    }
    const padMs = padEmbedded.ms;
    const padRate = padRows.length > 0 ? (padRows.length * 1000) / padMs : 0;
    console.log(
        `| ${pad('synthetic-pad', 14)} | 1 | ${padRows.length} | ${padRows.reduce((n, row) => n + row.content.length, 0)} | ` +
            `0.0 | 0.0 | 0.0 | ${number(padMs)} | ${number(padRate, 2)} |`,
    );
    console.log('');

    // ---- retrieval arms ----------------------------------------------------
    const armService = new RetrievalService(prisma, embeddings);
    const keywordTimes: number[] = [];
    const vectorTimes: number[] = [];
    const fusionTimes: number[] = [];
    let keywordHits = 0;
    for (const entry of questions) {
        const keyword = await timeIt(() =>
            armService.keywordSearch(BENCH_TEACHER_ID, entry.question, {}, ARM_LIMIT),
        );
        const vector = await timeIt(() =>
            armService.vectorSearch(BENCH_TEACHER_ID, entry.question, {}, ARM_LIMIT),
        );
        const fusion = await timeIt(async () => fuseHits(vector.value, keyword.value, 20));
        keywordTimes.push(keyword.ms);
        vectorTimes.push(vector.ms);
        fusionTimes.push(fusion.ms);
        if (keyword.value.length > 0) keywordHits += 1;
    }

    console.log('## Retrieval arms (one call per question, query embedding cold)');
    console.log('');
    console.log('| arm | p50 ms | p95 ms | max ms |');
    console.log('|---|---|---|---|');
    console.log(
        `| keyword-arm | ${number(median(keywordTimes), 2)} | ${number(percentile(keywordTimes, 95), 2)} | ${number(Math.max(...keywordTimes), 2)} |`,
    );
    console.log(
        `| vector-arm | ${number(median(vectorTimes), 2)} | ${number(percentile(vectorTimes, 95), 2)} | ${number(Math.max(...vectorTimes), 2)} |`,
    );
    console.log(
        `| fusion | ${number(median(fusionTimes), 3)} | ${number(percentile(fusionTimes, 95), 3)} | ${number(Math.max(...fusionTimes), 3)} |`,
    );
    console.log('');

    // ---- hybrid retrieve: cold vs warm ------------------------------------
    const coldService = new RetrievalService(prisma, embeddings);
    const coldTimes: number[] = [];
    for (const entry of questions) {
        const call = await timeIt(() =>
            coldService.retrieve(BENCH_TEACHER_ID, entry.question, { topK: 3 }),
        );
        coldTimes.push(call.ms);
    }
    const warmTimes: number[] = [];
    for (let pass = 0; pass < QUESTIONS_PER_PASS; pass += 1) {
        for (const entry of questions) {
            const call = await timeIt(() =>
                coldService.retrieve(BENCH_TEACHER_ID, entry.question, { topK: 3 }),
            );
            warmTimes.push(call.ms);
        }
    }
    console.log('## Hybrid retrieve (20 questions)');
    console.log('');
    console.log('| pass | n | p50 ms | p95 ms |');
    console.log('|---|---|---|---|');
    console.log(
        `| cold (fresh cache) | ${coldTimes.length} | ${number(median(coldTimes), 2)} | ${number(percentile(coldTimes, 95), 2)} |`,
    );
    console.log(
        `| warm (same service) | ${warmTimes.length} | ${number(median(warmTimes), 2)} | ${number(percentile(warmTimes, 95), 2)} |`,
    );
    console.log('');

    // ---- quality guard -----------------------------------------------------
    let hits = 0;
    const misses: string[] = [];
    for (const entry of questions) {
        const top = await coldService.retrieve(BENCH_TEACHER_ID, entry.question, { topK: 3 });
        const hit = top.some((chunk) => entry.expected.includes(chunk.chunkId));
        if (hit) hits += 1;
        else misses.push(`${entry.question} → [${top.map((chunk) => chunk.chunkId).join(', ')}]`);
    }
    console.log('## Quality guard (top-3 hit rate)');
    console.log('');
    console.log(`- questions: ${questions.length}`);
    console.log(`- hits: ${hits}`);
    console.log(`- rate: ${number((hits / questions.length) * 100, 1)}%`);
    for (const miss of misses) console.log(`- miss: ${miss}`);
    console.log('');

    // ---- re-ingest: second pass over the embedded corpus -------------------
    // Only the pad document: the keyword-only rows have no vector, so a second
    // pass over them would measure a first embedding, not a re-ingest.
    const docIds = ['bench-doc:pad'];
    let rerows = 0;
    let renew = 0;
    let remodelled = 0;
    let rereused = 0;
    const reService = new RetrievalService(prisma, embeddings);
    for (const docId of docIds) {
        const source = docId === 'bench-doc:pad' ? padRows : stressRows;
        const existing = new Set(
            (
                await prisma.sourceChunk.findMany({
                    where: { documentId: docId },
                    select: { id: true },
                })
            ).map((row) => row.id),
        );
        const fresh = source.filter((row) => !existing.has(row.id));
        renew += fresh.length;
        const all = await prisma.sourceChunk.findMany({
            where: { documentId: docId },
            select: { id: true, content: true, documentId: true, contentHash: true },
        });
        const stats = (await reService.embedChunks(all)) as
            | { embedded?: number; reused?: number }
            | undefined;
        rerows += all.length;
        // Baseline `embedChunks` returns nothing: every row is sent again.
        remodelled += stats ? (stats.embedded ?? 0) : all.length;
        rereused += stats?.reused ?? 0;
    }
    console.log('## Re-ingest (second pass over the same documents)');
    console.log('');
    console.log(
        `- rows: ${rerows} · new rows inserted: ${renew} · rows sent to the model: ${remodelled} · vectors reused: ${rereused}`,
    );
    console.log('');

    await prisma.$disconnect();
}

await main();
