# 10 — Teacher AI Toolkit (LLM-powered)

Three teacher-facing AI features beyond the at-risk classifier (spec 07):
**① year/term plan generator, ② test-paper generator, ③ source-grounded assistant**
(upload PDF/image of books/notes → summarize / ask / generate questions from them).

Rubric framing (say in review): spec 07 is the *self-built ML* feature; this toolkit is
the *AI-API* feature. Both documented with inputs/outputs/limitations/evaluation.

## Provider layer (`apps/api/src/ai/llm/`) — **admin-controlled, OpenAI-compatible**

The **admin decides which LLM powers every AI feature** — provider label, base URL,
text model, vision model, API key — from the settings UI, with no restart and no env
edit. Anything OpenAI-compatible works: DeepSeek, OpenAI, Groq, Together, Google
Gemini's OpenAI-compatible endpoint, or a local Ollama / LM Studio server.

```
llm.service.ts            complete({system, user, json?, vision?}) → string
                            reads AiProviderConfig (60s TTL cache) → openai SDK client
llm.providers.ts          generic OpenAI-compatible client + MockProvider
provider-config.service   admin CRUD, AES key storage, test-connection
llm/__fixtures__/         mock responses keyed by prompt fingerprint (tests/offline)
```

**DB — single config row, same schema as everything else (specs/04 cross-ref):**
```prisma
model AiProviderConfig {
  id          String  @id @default("singleton")  // exactly one row
  name        String                             // display label, e.g. "DeepSeek"
  baseUrl     String                             // https://api.deepseek.com/v1
  textModel   String                             // deepseek-chat | gpt-4o-mini | llama3.1:8b …
  visionModel String?                            // image→text path (Feature C); null = text-only
  apiKeyEnc   String?                            // AES-256-GCM ciphertext
  apiKeyHint  String?                            // "sk-…abcd" for UI mask
  temperature Float   @default(0.3)
  maxTokens   Int     @default(2048)
  enabled     Boolean @default(true)             // kill switch → AI routes 503
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Env = boot defaults + fallback only** (runtime truth is the DB row):

| Env | Purpose |
|---|---|
| `AI_CONFIG_SECRET` `[REQUIRED]` | AES-256-GCM key encrypting stored provider API keys |
| `AI_PROVIDER` | initial provider selection (`deepseek` \| `mock`); the mock row keeps the demo offline |
| `DEEPSEEK_API_KEY/BASE_URL/MODEL` `[OPTIONAL]` | seed the provider row on first migrate/seed |
| `GEMINI_API_KEY` `[OPTIONAL]` | seed vision-model default |

- **Single SDK:** the `openai` package pointed at whatever base URL is configured —
  every listed vendor exposes OpenAI-compatible APIs. No per-vendor SDK.
- **Default:** seed fills DeepSeek (`deepseek-chat`) so the demo needs one key; the
  admin can repoint at a local Ollama (`http://localhost:11434/v1`) live — the
  **Test connection** button proves it (latency + raw reply; accepts unsaved form values).
- **Keyless fallback:** with no usable DB key, `KILO_GATEWAY_URL` + `KILO_API_TOKEN`
  + `KILO_MODEL` serve the same OpenAI-compatible endpoint. `kilo-auto/free` is a
  lottery: it can route to a reasoning model (observed: `minimax/minimax-m3.1-flash:free`)
  that spends the entire `max_tokens` budget on reasoning and returns **empty
  content** — `reasoning:{enabled:false}`, `reasoning:{effort:"minimal"}` and
  `reasoning_effort:"none"` are all ignored. Pin a non-reasoning free model
  (default in `.env.example`: `nvidia/nemotron-3-super-120b-a12b:free`); the
  gateway logs `returned no text (finish_reason=…)` when this happens.
- **Config applies ≤60s** (TTL cache; save invalidates immediately). No restart.
- **JSON mode:** all generator calls use `response_format: {type: "json_object"}` +
  response validated with a zod schema. Parse/validate failure → **one retry**, then
  502 `AI_OUTPUT_INVALID` with the raw text logged (never persisted to domain tables).
- **MockProvider:** deterministic canned responses keyed by prompt fingerprint
  (fixtures in `llm/__fixtures__/`). Tests + the mock provider row never hit the network —
  the demo survives a dead API key.
- **Server does the math, not the model:** dates, totals, codes, sequencing are computed
  server-side from LLM *content* only. The LLM never emits week dates or mark sums —
  reliability trick, stated in review.

## Feature A — Year/Term Plan Generator (`ai/plans/`)

**Flow:** teacher picks class + subject (only their ClassSubject assignments), plan type
(YEAR|TERM), start date, number of weeks (defaults: YEAR→remaining academic weeks,
TERM→12); optional topic hints textarea → POST `/ai/plans/generate` → editable week grid
→ save / regenerate per week / activate.

**LLM contract (content only):**
```json
{"title": "…", "weeks": [{"week": 1, "topics": ["…"], "objective": "…", "assessment": "…"}]}
```
Server fills `startAt` per week from `startDate` (weekly cadence, skips Fridays —
BD weekend), validates week count matches request, rejects empty topics.

**DB:**
```prisma
model TeachingPlan {
  id        String   @id @default(cuid())
  teacherId String
  teacher   Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  classId   String
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  type      PlanType                  // YEAR | TERM
  title     String
  startDate DateTime
  weeks     Json                      // [{week, startAt, topics[], objective, assessment, status}]
  status    PlanStatus @default(DRAFT) // DRAFT | ACTIVE | ARCHIVED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([teacherId, classId, subjectId, type, startDate])
}
enum PlanType  { YEAR TERM }
enum PlanStatus { DRAFT ACTIVE ARCHIVED }
```

**Business rules:**
- One ACTIVE plan per (teacher, class, subject); activating a new one archives the old
  (transaction).
- Week status `PLANNED|DONE` toggled by teacher → plan progress % = DONE/total
  (surfaced on teacher dashboard: "Math 8 syllabus 42%").
- **Regenerate one week** (`POST /ai/plans/:id/weeks/:n/regenerate`): re-asks the LLM
  for that week's topics given neighboring weeks as context; other weeks (incl. teacher
  edits) untouched. Full regenerate = new DRAFT, never clobbers ACTIVE silently.
- Week dates are computed by the **server** from `startDate`, advancing 7 days
  at a time and skipping Fridays (BD weekend) — the LLM never supplies dates.
- Editing one week (`PATCH /ai/plans/:id/weeks/:n`) changes only that week; its
  `status` and `startAt` are left alone.

**UX pages:** `teacher/studio?view=plans` (the plan list, in the Studio pane:
class/subject, type, start date, progress bar, status), `plans/new` (full-page
form — no modal — → generate → the plan appears in the list), `plans/[id]` (the
plan on its own page: the editable week grid with topic/objective/assessment
inputs, a DONE checkbox per week, per-week AI regenerate, and activate).

**Limitations (README + model card):** model may mis-order official NCTB chapter
sequence or invent pacing — teacher must verify against the textbook (UI shows this
warning on every generated plan); no per-student differentiation; assumes 5-day week.

## Feature B — Test Paper Generator (`ai/tests/`)

**Flow:** teacher picks class + subject, topics (multi-select from their ACTIVE plan's
flattened topics, or free text), blueprint: question mix (MCQ ×N, short ×N, long ×N),
total marks, duration, difficulty mix (easy/medium/hard %) → **delivery mode**
(print/offline vs online) → generate → editable paper with answer key → save → print view.

**Delivery modes** — every paper carries a `mode`:

| Mode | Meaning | Extra fields |
|---|---|---|
| `OFFLINE` (default) | Paper handed out in class; students write on paper. | — |
| `ONLINE` | Students answer in the portal inside a time window. | `startAt`, `endAt` (both required) |

`ONLINE` generation is rejected with 400 unless both dates are present and
`startAt < endAt`. A student may only start an attempt while the current time is
inside `[startAt, endAt]`; attempts are scoped to the student's enrolled class.

**LLM contract:**
```json
{"title": "…",
 "groups": [
   {"type": "MCQ", "questions": [{"text": "…", "options": ["…","…","…","…"], "answer": "b", "explanation": "…", "difficulty": "easy"}]},
   {"type": "SHORT",  "questions": [{"text": "…", "answer": "…", "difficulty": "medium"}]},
   {"type": "LONG",   "questions": [{"text": "…", "answer": "…", "difficulty": "hard"}]}
 ]}
```
Server assigns per-question marks (MCQ 1, short 2, long per blueprint math), validates
`Σ marks == totalMarks` (adjust last long question or 502), normalizes to rows.

**DB:**
```prisma
model QuestionPaper {
  id        String   @id @default(cuid())
  teacherId String
  teacher   Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  classId   String
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  title     String
  durationMinutes Int
  totalMarks Int
  status    PaperStatus @default(DRAFT)  // DRAFT | FINAL
  mode      TestMode    @default(OFFLINE) // OFFLINE | ONLINE
  startAt   DateTime?                    // ONLINE only
  endAt     DateTime?                    // ONLINE only
  questions Question[]
  attempts  TestAttempt[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Question {
  id       String  @id @default(cuid())
  paperId  String
  paper    QuestionPaper @relation(fields: [paperId], references: [id], onDelete: Cascade)
  type     QuestionType               // MCQ | SHORT | LONG
  text     String
  options  Json?                      // MCQ only
  answer   String                     // model answer / correct option
  explanation String?
  difficulty String                   // easy | medium | hard
  marks    Int
  order    Int
  answers  StudentAnswer[]
}
model TestAttempt {
  id          String   @id @default(cuid())
  paperId     String
  paper       QuestionPaper @relation(fields: [paperId], references: [id], onDelete: Cascade)
  studentId   String
  student     Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  status      AttemptStatus @default(IN_PROGRESS)  // IN_PROGRESS | SUBMITTED | GRADED
  startedAt   DateTime @default(now())
  submittedAt DateTime?
  totalScore  Int?
  answers     StudentAnswer[]
  @@unique([paperId, studentId])
}
model StudentAnswer {
  id         String  @id @default(cuid())
  attemptId  String
  attempt    TestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answer     String
  score      Int?
  autoGraded Boolean?
  @@unique([attemptId, questionId])
}
enum QuestionType { MCQ SHORT LONG }
enum PaperStatus  { DRAFT FINAL }
enum TestMode     { OFFLINE ONLINE }
enum AttemptStatus { IN_PROGRESS SUBMITTED GRADED }
```

**Business rules:** marks-sum validation (above); FINAL papers are immutable except
delete (print view stable); every generated paper carries an `aiGenerated=true` badge +
"review before use" banner; teacher edits count toward a stored `editedByTeacher Bool`
(shown in review as the human-in-the-loop story).

**Online delivery — attempts & auto-grading** (`ai/tests/grading.util.ts` is the single
canonical implementation; the server does the comparing, never the LLM):

- A student has **one attempt per paper** (`@@unique([paperId, studentId])`); re-opening
  an in-progress attempt resumes it, re-opening a submitted one is a 409.
- **MCQ is auto-graded**: the chosen option letter must equal the model answer
  (case/whitespace-insensitive) → full marks, else zero. The answer is stored with
  `autoGraded: true`.
- **SHORT / LONG are not auto-gradable**: the answer is stored with `score: null` and
  `autoGraded: false` for the teacher to score.
- Submitting sets `status: SUBMITTED` and `totalScore` = sum of the auto-graded scores.
- The teacher scores a written answer with `POST /ai/tests/answers/:id/grade`; the score
  may not exceed the question's maximum marks. The attempt becomes `GRADED` only once
  **every** answer carries a score; until then it stays `SUBMITTED`.

**UX pages:** `teacher/studio?view=tests` (the paper list, in the Studio pane:
title, class/subject, marks, mode badge), `tests/new` (full-page blueprint form —
no modal), `tests/[id]` (the paper on its own page — A4 preview
with the school letterhead, answer-key toggle, detachable answer sheet),
`tests/[id]/print` (the print route), `tests/[id]/attempts` (teacher grading
view: per-attempt per-question scores), `student/tests` (list of open online
tests → attempt view with autosave → submit).

**Printing** follows the zylosync invoice pattern: the paper is rendered by
one shared component (`components/shared/test-paper.tsx`) as an A4 sheet
(210 × 297mm), and `/teacher/tests/[id]/print` renders it on a dedicated route
where the portal layout emits **no sidebar and no header** — the sheet is the
whole page. The print route's toolbar is `print:hidden`; `@page { size: A4 }`
plus `break-inside: avoid` keep a question from splitting across pages.
`?answers=1` adds the answer key, `?sheet=1` adds the detachable answer sheet.

**Numbering and marks are the server's.** The LLM sometimes bakes "1." or
"[2 marks]" into the question text; `normaliseQuestionText` strips both on the
way in, so a printed question never reads "1. 1. [2 marks] …".
**Limitations:** questions can be off-blueprint in difficulty feel (teacher judges);
no item-response statistics; explanations can be wrong — answer key must be checked;
 Bengali-medium question phrasing quality depends on model (prompt requests
`language: match user's plan language`).

## Feature C — Source-Grounded Assistant (`ai/sources/`)

**Upload:** teacher drops PDF (≤10MB, text-based) or image PNG/JPG (≤5MB, scanned page
photo). `POST /ai/sources` multipart (multer `FileInterceptor`, mime-validated,
filename sanitized, stored under `apps/api/uploads/` gitignored; R2/S3 out of scope).

**Extraction pipeline** (async, in-process — no queue). The upload request
returns at once with the row `PROCESSING`; the steps below run in the
background and flip it to `READY` (or `FAILED`, which the UI offers to retry).
An upload therefore never waits for the embeddings or the summary; the client
polls the list while anything is `PROCESSING`, and a boot-time sweep marks a
`PROCESSING` row older than 15 minutes `FAILED` (a restart mid-ingest).
1. PDF → `unpdf` (`extractText`) → page-tagged text; zero text layer → status
   `FAILED` (limitation surfaced; the image-only path handles the demo case).
2. Image → the provider's vision model → page text.
   A PDF with no text layer is not a failure: it is marked `NEEDS_OCR`, and an
   explicit "Transcribe with OCR" action rasterizes the stored file with
   poppler (`pdftoppm`, 200 dpi) and reads each page with tesseract, then runs
   the same chunk → embed → summarize tail. Both binaries are optional; when
   absent the row stays `NEEDS_OCR` and the message says so. (162-page scan
   measured: ~2 min, zero API cost.)
3. Page furniture → dropped (`text-clean.util.ts`): a line repeated at the top or
   bottom of ≥40% of pages (running head, footer, bare number) is removed before
   chunking, so scans do not embed "English For Today 6" into every chunk. Only
   page edges are considered; body text is untouched.
4. Text → chunk (~1200 chars, page-preserving overlap 150) → `SourceChunk` rows.
5. Auto-summarize: structured summary `{keyTopics[], glossary[{term,definition}],
   summary, suggestedQuestions[5]}` → stored on document. Long text is condensed
   in ~6000-char windows (max 8) into bullet notes first, then one JSON call sees
   the notes; a malformed JSON answer is retried once. A failed summary still
   leaves the chunks usable.

**DB:**
```prisma
model SourceDocument {
  id        String   @id @default(cuid())
  teacherId String
  teacher   Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  classId   String?
  subjectId String?
  filename  String
  kind      SourceKind                // PDF | IMAGE
  pages     Int?
  status    SourceStatus @default(PROCESSING) // PROCESSING | READY | NEEDS_OCR | FAILED
  summary   Json?
  chunks    SourceChunk[]
  createdAt DateTime @default(now())
}
model SourceChunk {
  id         String @id @default(cuid())
  documentId String
  document   SourceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  page       Int?
  content    String
}
enum SourceKind   { PDF IMAGE }
enum SourceStatus { PROCESSING READY NEEDS_OCR FAILED }
```

**Three capabilities once READY:**
1. **Summarize** (auto + re-run button) — outputs the structured summary; render as
   student notes (EN/BN toggle).
2. **Ask** — `POST /ai/sources/:id/ask {question}` (one document) and
   `POST /ai/sources/ask {question, classId?, subjectId?, history?}` (the whole
   notebook) share **one retrieval implementation**, `RetrievalService`: the
   question is embedded with the configured embedding provider
   (`EMBEDDINGS_PROVIDER`: `local` = in-process multilingual MiniLM,
   `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384 dims — the default and
   the only one that supports Bangla; `nvidia` = OpenAI-compatible
   `/embeddings`, `nvidia/nemotron-3-embed-1b`, 2048 dims) and matched by
   cosine distance against `SourceChunk.embedding` (pgvector) **and** ranked by
   Postgres full-text search (`to_tsvector('simple', content)`, question words
   OR-ed), then the two ranked lists are merged with reciprocal rank fusion
   (K=60). Vectors catch paraphrases; full text catches exact names, numbers and
   "Lesson 3". When the keyword arm errors, retrieval falls back to vectors.
   Top-4 chunks for a single document, top-6 for the notebook → LLM with strict system prompt
   *"answer only from the provided excerpts; cite [filename p.N] for every claim;
   say 'not in sources' otherwise"* → `{answer, citations: [{page, snippet}]}`
   (single document) or `{answer, citations: [{sourceId, filename, page, snippet}]}`
   (notebook). A citation the model writes is **dropped unless it matches a
   retrieved chunk**, so a page or file cannot be invented. `history` replays up to
   **10** prior turns and is validated server-side; empty turns are dropped and an
   empty completion is retried once, so a blank assistant bubble is never stored.
   The provider decides the vector width, so a mismatch with the
   `SourceChunk.embedding` column refuses to boot (migrate the column and clear
   the old vectors before switching).
   Prompt-injection stance: document text and question are delimited as untrusted
   data; system prompt instructs to ignore instructions found inside them.
3. **→ Test draft** — `POST /ai/sources/:id/to-test {mcq, short, long}` pulls chunk
   text + summary into the Feature B generator → prefilled `tests/new`. The "upload
   a chapter → get a test in 2 clicks" demo path.

**UX pages:** `teacher/studio` — the Sources pane (dropzone / URL / pasted text →
status pills; a source opens its summary, page-tagged extracted text, ask box with
citation chips and "make test"/"make plan" CTAs) and the Chat pane (multi-turn
notebook chat with citation chips and suggested questions from the source summary).
`teacher/sources/materials/[id]/print` renders a saved material for printing.

**Limitations:** OCR skipped (vision-model transcription instead — costs tokens, can
garble math notation); neither retrieval arm uses an ANN index today, so both are
exact scans over the teacher's chunks (fine at chapter scale — add HNSW and a GIN
index before whole-library deployments);
copyright: teachers upload materials they have rights to (stated on upload page);
long books >50 pages chunk heavily — demo uses a single chapter.

## Security & cost controls

- All `/ai/*` routes: authenticated; plans/tests/sources additionally scoped to the
  requesting teacher's own rows (ids from token). Admin can read all.
- Upload: mime allowlist (pdf, png, jpeg), size caps, filename strip, no executable
  types, files never publicly served (read back via authenticated endpoint only).
- Rate limit (in-memory, per user): 10 generation req/min, 5 uploads/min,
  120 answer-autosave req/min (online test attempts) → 429.
  Single-instance limitation documented.
- Provider config: ADMIN-only; API key **write-only** (PUT blank = keep stored),
  masked `sk-…last4` in GET, AES-256-GCM at rest (`AI_CONFIG_SECRET`), decrypted only
  in-process; test-connection 5/min; baseUrl protocol-checked (http/https only).
- Prompt budget guard: retrieved/extracted context truncated to ~8K chars per call.
- Cost (demo scale, DeepSeek pricing ballpark): plan ≈ 2K in/1K out, test ≈ 2K/2K,
  summarize ≈ 4K in/0.5K out → **fractions of a US cent per generation**; full demo
  run < $0.05. Stated in README — reviewers love knowing the bill.

## Evaluation story (rubric: "explain how you evaluated usefulness")

1. **Determinism tests:** MockProvider fixtures assert JSON contracts, validation
   retries, marks-sum enforcement, week-date computation — the engineering is tested.
2. **Manual quality pass (committed):** `test-reports/ai-toolkit-eval.md` — for
   Class 8 Math: generated year plan vs actual NCTB chapter order (table: match /
   mismatch / pacing note); 1 generated paper reviewed for difficulty spread and
   answer correctness; Ask on a seeded chapter page with 5 sample questions
   (answer correct? cited page right? abstained when out-of-scope?).
3. **Human-in-the-loop framing:** every artifact editable before use; `editedByTeacher`
   tracked; UI badges "AI-generated — verify". The tool drafts, the teacher decides.
4. **Provider hot-switch demo:** in settings, Test connection against DeepSeek, then
   repoint base URL at a local Ollama (or force mock) and test again — live latency +
   reply proves the vendor-neutral claim; every AI feature keeps working from the same UI.

## API additions (see specs/05 for full table)

```
GET/PUT /ai/provider-config · POST /ai/provider-config/test   # admin; key write-only/masked
POST /ai/plans/generate · GET /ai/plans · PATCH /ai/plans/:id
POST /ai/plans/:id/weeks/:n/regenerate · PATCH /ai/plans/:id/weeks/:n/status
POST /ai/tests/generate · GET /ai/tests/:id · PATCH /ai/tests/:id
POST /ai/tests/:id/questions · PATCH/DELETE /ai/tests/:id/questions/:qid
GET /ai/tests/online/available                          # student: open online tests
POST /ai/tests/:id/attempts                              # student: start/resume
POST /ai/tests/attempts/:attemptId/answers               # student: save one answer
POST /ai/tests/attempts/:attemptId/submit                # student: submit
GET /ai/tests/:id/attempts                               # teacher: attempts on a paper
POST /ai/tests/answers/:answerId/grade                   # teacher: score a written answer
POST /ai/sources (multipart) · GET /ai/sources · GET /ai/sources/:id
POST /ai/sources/:id/summarize · POST /ai/sources/:id/ask · POST /ai/sources/:id/to-test
```

## Cut priority (if Phase 5b-d runs long)

Order: ① sources/ask citations (keep summarize+ask simple) → ② per-week regenerate →
③ →to-test bridge (keep manual topic entry) → ④ manual question add on paper →
⑤ summarize re-run. **Never cut:** plan generate+edit+save, test generate+edit+save,
upload+extract+summary (the user's core ask), mock provider, JSON validation.

## Future work (README only)

Embeddings-based retrieval, OCR fallback for image-less PDFs, lesson-plan (single
session) generator, question-bank reuse across papers, Bloom's-taxonomy targeting,
BN-first prompt tuning, per-term retrain of spec-07 on term outcomes.
