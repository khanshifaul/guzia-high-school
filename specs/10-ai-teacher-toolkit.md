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
| `AI_PROVIDER` / `AI_MOCK` | initial provider selection / force mock (tests, offline demo) |
| `DEEPSEEK_API_KEY/BASE_URL/MODEL` `[OPTIONAL]` | seed the provider row on first migrate/seed |
| `GEMINI_API_KEY` `[OPTIONAL]` | seed vision-model default |

- **Single SDK:** the `openai` package pointed at whatever base URL is configured —
  every listed vendor exposes OpenAI-compatible APIs. No per-vendor SDK.
- **Default:** seed fills DeepSeek (`deepseek-chat`) so the demo needs one key; the
  admin can repoint at a local Ollama (`http://localhost:11434/v1`) live — the
  **Test connection** button proves it (latency + raw reply; accepts unsaved form values).
- **Config applies ≤60s** (TTL cache; save invalidates immediately). No restart.
- **JSON mode:** all generator calls use `response_format: {type: "json_object"}` +
  response validated with a zod schema. Parse/validate failure → **one retry**, then
  502 `AI_OUTPUT_INVALID` with the raw text logged (never persisted to domain tables).
- **MockProvider:** deterministic canned responses keyed by prompt fingerprint
  (fixtures in `llm/__fixtures__/`). Tests + `AI_MOCK=true` demo never hit the network —
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

**UX pages:** `teacher/plans` (cards: class/subject, type, progress bar, status),
`plans/new` (form-card → generate → spinner → editable grid: week rows with topic
inputs, objective, DONE checkbox), `plans/[id]` (edit, per-week regenerate, activate).

**Limitations (README + model card):** model may mis-order official NCTB chapter
sequence or invent pacing — teacher must verify against the textbook (UI shows this
warning on every generated plan); no per-student differentiation; assumes 5-day week.

## Feature B — Test Paper Generator (`ai/tests/`)

**Flow:** teacher picks class + subject, topics (multi-select from their ACTIVE plan's
flattened topics, or free text), blueprint: question mix (MCQ ×N, short ×N, long ×N),
total marks, duration, difficulty mix (easy/medium/hard %) → generate → editable paper
with answer key → save → print view.

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
  questions Question[]
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
}
enum QuestionType { MCQ SHORT LONG }
enum PaperStatus  { DRAFT FINAL }
```

**Business rules:** marks-sum validation (above); FINAL papers are immutable except
delete (print view stable); every generated paper carries an `aiGenerated=true` badge +
"review before use" banner; teacher edits count toward a stored `editedByTeacher Bool`
(shown in review as the human-in-the-loop story).

**UX pages:** `teacher/tests` (list, status, print), `tests/new` (blueprint form-card →
generate → grouped editable question list, answer-key toggle, per-question delete/add
manual), `tests/[id]` (print-friendly view via `window.print()`, answer key section).

**Limitations:** questions can be off-blueprint in difficulty feel (teacher judges);
no item-response statistics; explanations can be wrong — answer key must be checked;
 Bengali-medium question phrasing quality depends on model (prompt requests
`language: match user's plan language`).

## Feature C — Source-Grounded Assistant (`ai/sources/`)

**Upload:** teacher drops PDF (≤10MB, text-based) or image PNG/JPG (≤5MB, scanned page
photo). `POST /ai/sources` multipart (multer `FileInterceptor`, mime-validated,
filename sanitized, stored under `apps/api/uploads/` gitignored; R2/S3 out of scope).

**Extraction pipeline** (async, in-process — no queue):
1. PDF → `unpdf` (`extractText`) → page-tagged text; zero text layer → status
   `NEEDS_OCR` (limitation surfaced; image-only path handles the demo case).
2. Image → Gemini vision → page text + short caption.
3. Text → chunk (~1200 chars, page-preserving overlap 150) → `SourceChunk` rows.
4. Auto-summarize: structured summary `{keyTopics[], glossary[{term,definition}],
   summary, suggestedQuestions[5]}` → stored on document.

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
2. **Ask** — `POST /ai/sources/:id/ask {question}` → **RAG-lite retrieval**:
   tokenize question, score chunks by keyword overlap (IDF-weighted, own ~30-line
   implementation in `ai/retrieval.ts` — no vector DB, no embeddings dependency),
   top-4 chunks → LLM with strict system prompt *"answer only from the provided
   excerpts; cite [p.N] for every claim; say 'not in document' otherwise"* →
   `{answer, citations: [{page, snippet}]}` shown with page chips.
   Prompt-injection stance: document text and question are delimited as untrusted
   data; system prompt instructs to ignore instructions found inside them.
3. **→ Test draft** — `POST /ai/sources/:id/to-test {mcq, short, long}` pulls chunk
   text + summary into the Feature B generator → prefilled `tests/new`. The "upload
   a chapter → get a test in 2 clicks" demo path.

**UX pages:** `teacher/sources` (dropzone + list w/ status pills), `sources/[id]`
(summary card, page-tabbed extracted text, ask box with citation chips, "make test"
CTA).

**Limitations:** OCR skipped (vision-model transcription instead — costs tokens, can
garble math notation); keyword retrieval misses paraphrases (embeddings = future
work); copyright: teachers upload materials they have rights to (stated on upload
page); long books >50 pages chunk heavily — demo uses a single chapter.

## Security & cost controls

- All `/ai/*` routes: authenticated; plans/tests/sources additionally scoped to the
  requesting teacher's own rows (ids from token). Admin can read all.
- Upload: mime allowlist (pdf, png, jpeg), size caps, filename strip, no executable
  types, files never publicly served (read back via authenticated endpoint only).
- Rate limit (in-memory, per user): 10 generation req/min, 5 uploads/min → 429.
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
