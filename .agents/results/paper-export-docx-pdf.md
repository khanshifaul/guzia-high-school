---
id: paper-export-docx-pdf
title: Export QuestionPaper as Unicode DOCX and PDF
status: done
gate: auto
---

## Summary

Added a template-agnostic paper model plus DOCX and Typst/PDF renderers, the
`GET /api/ai/tests/:id/export?format=docx|pdf` route (TEACHER, PDF default,
404 for another teacher's paper), and a 400 guard for legacy Bijoy artifacts.
The DOCX is A4/12 mm, one continuous two-column section for a 30-item MCQ, with
explicit `ascii/hAnsi: Liberation Sans` and `cs/eastAsia: Noto Sans Bengali`
runs. The PDF is compiled by Typst 0.15.1 with vendored Bengali fonts, a 20 s
timeout, and a throwaway `--root`; a missing binary is a call-time
`ServiceUnavailableException`. The API image pins and sha256-verifies the Typst
static musl tarball, installs `fonts-liberation`, and copies the fonts.

## Files changed

- `apps/api/src/ai/tests/export/paper.model.ts`
- `apps/api/src/ai/tests/export/docx.renderer.ts`
- `apps/api/src/ai/tests/export/pdf.renderer.ts`
- `apps/api/src/ai/tests/export/export-file.util.ts`
- `apps/api/src/ai/tests/export/paper.model.spec.ts`
- `apps/api/src/ai/tests/export/paper-export.spec.ts`
- `apps/api/src/ai/tests/export/export-file.util.spec.ts`
- `apps/api/src/ai/tests/tests.service.ts`
- `apps/api/src/ai/tests/tests.controller.ts`
- `apps/api/package.json` (`docx@9.15.1`)
- `bun.lock`
- `apps/api/Dockerfile`
- `apps/api/.env.example` (`TYPST_BIN`, `EXPORT_FONT_PATH`)
- `apps/api/assets/fonts/NotoSansBengali-Regular.ttf`
- `apps/api/assets/fonts/NotoSansBengali-Bold.ttf`
- `apps/api/assets/fonts/NotoSansBengaliUI-Regular.ttf`
- `apps/api/assets/fonts/NotoSansBengaliUI-Bold.ttf`
- `apps/api/assets/fonts/OFL.txt`

## Verify

```
$ bun install --frozen-lockfile
Checked 1123 installs across 1285 packages (no changes) [30.80s]
exit 0

$ bun --filter @guzia/api test
Test Suites: 20 passed, 20 total
Tests:       215 passed, 215 total
exit 0

$ bun run lint
$ oxlint apps
(no findings, exit 0)

$ bun --filter @guzia/api build
@guzia/api build: Exited with code 0
```

Measured artifacts (30-MCQ fixture, totalMarks 30, and 70-mark creative
fixture; rendered from the final source):

| Fixture | PDF bytes | DOCX bytes | `pdfinfo` pages | Page size |
|---|---:|---:|---:|---|
| 30 MCQ | 36,593 | 11,572 | 1 | 595.276 × 841.89 pt (A4) |
| 70-mark creative | 36,314 | 10,518 | 1 | 595.276 × 841.89 pt (A4) |

DOCX (unzipped `word/document.xml`): 30 question-number runs matching
`<w:t[^>]*>[০-৯]+\.</w:t>`, `<w:cols w:space="360" w:num="2" w:equalWidth="true"/>`,
0 matches for `SutonnyMJ|Bijoy`.

PDF: 0 matches for `[‡†½¼¾ƒ]` in both fixtures.

`pdftotext /tmp/final-mcq.pdf -` excerpt:

```
গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়
বার্ষিক পরীক্ষা ২০২৬

নবম শ্রেণি · গণিত
সময় ৩০ মিনিট · পূর্ণমান ৩০
নাম: ………………………………… রোল: …………………………
প্রশ্নপত্রে ৩০টি বহুনির্বাচনি প্রশ্ন রয়েছে। প্রতিটি প্রশ্নের মান ১।

১. নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:
১ + ১ = কত?
ক) প্রথম
```

Creative sections from `pdftotext /tmp/final-creative.pdf -`:

```
বিভাগ ক — ২ নম্বরের প্রশ্ন
বিভাগ খ — ৪ নম্বরের প্রশ্ন
বিভাগ গ — ৮ নম্বরের প্রশ্ন
```

Container smoke test (built `ghs-api-new` image, mounted a script, cwd
`/app/apps/api`): the built `dist` rendered both formats; `pdf=35,325`,
`docx=11,498`; `pdfinfo` reported 1 A4 page; `pdftotext` found the Bengali
school name.

Image-size delta (same build context; baseline Dockerfile from
`git show origin/main:apps/api/Dockerfile`; `docker image inspect --format
'{{.Size}}'`):

| Measurement | Bytes |
|---|---:|
| Baseline image (`ghs-api-baseline-clean`) | 2,356,867,135 |
| New image (`ghs-api-new-clean`) | 2,444,595,725 |
| `.Size` delta | 87,728,590 (83.7 MiB) |

The new runtime layer is 198 MB vs the baseline's 139 MB (+59 MB); the fonts
layer is 717 kB. The added-layer and filesystem measurements separate the
feature from layer-packing noise in the two independently built stages:
`du -sb` inside the images shows `/app` +708,667 B, `/usr` +58,298,128 B
(Typst binary 55,739,488 B + Liberation fonts), `/var` +12,822 B, `/etc`
−14,824 B — a net `+59,004,793 B` (56.3 MiB). The `.Size` delta is larger
because the build-stage layers were packed separately.

## Commit

18d85d233129d81521785baed6d3b270b0b2c649

## Blockers

none

## Reflection

The non-UI `Noto Sans Bengali` cut renders correctly but poppler's `pdftotext`
emits each matra twice (`গুজিয়া` → `গুজিয়ায়ায়া`), which would fail the
acceptance check that reads the header back. The UI cut of the same typeface
extracts exactly, so both cuts are vendored and the PDF font tuple lists the
UI cut first with the requested non-UI family as fallback. Measured with Typst
0.15.1 and poppler.

The creative fixture uses three distinct mark tiers (2/4/8) because the schema
has no sub-part index; the model groups by distinct `marks` ascending as the
brief specifies. If the archive's 2/4/4 sub-parts must produce three headings,
the schema needs a sub-part field — inferring it from question order would be
exactly the parsing the brief forbids.
