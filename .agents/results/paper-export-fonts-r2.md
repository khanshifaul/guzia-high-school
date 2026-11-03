---
id: paper-export-fonts-r2
title: Correct export fonts — DOCX Kalpurush name-only (all four rFonts attrs), PDF keeps bundled Noto
status: done
gate: auto
---

## Summary

Correction of `paper-export-fonts` (see radio PM 747, 2026-11-03), which had
dropped `eastAsia` from the DOCX run font and swapped the PDF's Bengali face to
a bundled Kalpurush. Both are fixed here.

- **DOCX:** `BODY_FONT` now carries all four attributes —
  `ascii="Times New Roman" hAnsi="Times New Roman" cs="Kalpurush"
  eastAsia="Kalpurush"` — so every run and `docDefaults` emits the full
  `rFonts` set. `w:sz`/`w:szCs` remain on every run. No font file ships with
  the DOCX; Word resolves Kalpurush by name from the reader's machine.
- **PDF:** the Typst tuple is back to
  `("Liberation Serif", "Noto Sans Bengali UI", "Noto Sans Bengali")`. Latin
  selects Liberation Serif (Times New Roman is not redistributable), Bengali
  falls through to the bundled Noto UI cut. The four Noto TTFs and their
  `OFL.txt` were restored from `945beb1`; `Kalpurush0.258ship.ttf` and
  `Kalpurush-LICENSE.txt` are deleted. Kalpurush is bundled nowhere.

**Deliberate difference, not an oversight:** the DOCX references Kalpurush by
name only and embeds nothing; the PDF embeds Noto Sans Bengali because Noto is
OFL, while Kalpurush's licence is not relied on for bundling.

## Files changed

- `apps/api/src/ai/tests/export/docx.renderer.ts` — `eastAsia: 'Kalpurush'` in
  `BODY_FONT`; comment now states name-only resolution and the four attributes.
- `apps/api/src/ai/tests/export/pdf.renderer.ts` — Noto tuple restored; comment
  records the PDF/DOCX licence split.
- `apps/api/src/ai/tests/export/paper-export.spec.ts` — asserts
  `w:eastAsia="Kalpurush"` in both `document.xml` and `docDefaults`; the existing
  30-item, two-column, `w:szCs` and legacy-name assertions are unchanged.
- `apps/api/Dockerfile` — comment only: the vendored Bengali face is Noto, not
  Kalpurush.
- `apps/api/assets/fonts/NotoSansBengali-{Regular,Bold}.ttf` (restored)
- `apps/api/assets/fonts/NotoSansBengaliUI-{Regular,Bold}.ttf` (restored)
- `apps/api/assets/fonts/OFL.txt` (restored, Noto OFL)
- `apps/api/assets/fonts/Kalpurush0.258ship.ttf` (deleted)
- `apps/api/assets/fonts/Kalpurush-LICENSE.txt` (deleted)

Git reports `Kalpurush-LICENSE.txt -> OFL.txt` as a rename because both are SIL
OFL texts; the tracked content is Noto's licence from `945beb1`, whose
copyright line is `Copyright 2022 The Noto Project Authors`.

## Fonts shipped

Only Noto Sans Bengali (PDF Bengali) and Liberation Serif (PDF Latin) remain
under `apps/api/assets/fonts/`:

| File | Bytes | sha256 |
|---|---:|---|
| `LiberationSerif-Regular.ttf` | 393,692 | `86b9ea1c2f41bed9d7c09ccad4abc2894b33df5de60e5bbbece5d48610911870` |
| `LiberationSerif-Bold.ttf` | 370,196 | `28f2d4300ee366d1ff9ca95df967a27e77987c87857fad0d9c85034405aae39d` |
| `LiberationSerif-LICENSE.txt` | 4,414 | `93fed46019c38bbe566b479d22148e2e8a1e85ada614accb0211c37b2c61c19b` |
| `NotoSansBengali-Regular.ttf` | 143,072 | `b55c62ee531e3214da6c0701daecea89a52ba42db7d8206b92e6b51f397a3193` |
| `NotoSansBengali-Bold.ttf` | 144,828 | `923c6a4c2eb618a57ed83f4bca855b4f5287b87906a4d9df40a2ffa8ebd8c2e8` |
| `NotoSansBengaliUI-Regular.ttf` | 203,732 | `ab2f54c0922024eb8813c3f33e335f137505861dba38d78195cf32b7c3ed8be2` |
| `NotoSansBengaliUI-Bold.ttf` | 212,652 | `0d46caf69318377337ca4c4e92907af11ea4bdef5465c8d5cfe17f8771d824a7` |
| `OFL.txt` | 4,383 | `754f0e221aa7d5a915489f3bf1f20fe53ddc35ab2834a4d91656d78f9622de70` |

## DOCX XML assertions

Rendered from `mcqFixture` (30 items; `/tmp/mcq.docx`, 11,520 bytes):

```
$ unzip -p /tmp/mcq.docx word/document.xml | grep -o '<w:rFonts[^/]*/>' | sort | uniq -c
    427 <w:rFonts w:ascii="Times New Roman" w:cs="Kalpurush" w:eastAsia="Kalpurush" w:hAnsi="Times New Roman"/>

$ unzip -p /tmp/mcq.docx word/styles.xml | grep -o '<w:docDefaults>.*</w:docDefaults>'
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Kalpurush" w:eastAsia="Kalpurush" w:hAnsi="Times New Roman"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>
```

- `w:ascii="Times New Roman"`: 427 in `document.xml`, 1 in `docDefaults`
- `w:cs="Kalpurush"`: 427 / 1
- `w:eastAsia="Kalpurush"`: 427 / 1
- `<w:szCs`: 427 / 1 (`w:sz` is also 427; every run has both)
- Numbered runs (`<w:t>[০-৯]+.</w:t>`): 30
- Columns: `<w:cols w:space="360" w:num="2" w:equalWidth="true"/>`
- Legacy names (`SutonnyMJ|Bijoy|Noto Sans Bengali`) across `*.xml`: 0 matches

## PDF output

| Fixture | PDF bytes | `pdfinfo` pages | Page size | `[‡†½¼¾ƒ]` matches |
|---|---:|---:|---|---:|
| 30 MCQ | 59,821 | 1 | 595.276 × 841.89 pt (A4) | 0 |
| 70-mark creative | 49,809 | 1 | 595.276 × 841.89 pt (A4) | 0 |

`pdffonts /tmp/mcq.pdf` embeds `NotoSansBengaliUI-Regular`, `NotoSansBengaliUI-Bold`,
`LiberationSerif`, `LiberationSerif-Bold` (and `LiberationSerif-Italic`); no
Kalpurush face is present.

`pdftotext /tmp/mcq.pdf -` excerpt:

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

খ) দ্বিতীয়

গ) তৃ তীয়

ঘ) চতু র্থ
```

The header and all 30 numbered items extract; the Noto UI cut leaves a space
inside `তৃতীয়`/`চতুর্থ` (an extraction artifact, not a rendering one). The
spec asserts the stable header lines plus every item number rather than pinning
a font artifact.

## Verify

```
$ bun install --frozen-lockfile
1117 packages installed [7.83s]
exit 0

$ bun --filter @guzia/api test
Test Suites: 25 passed, 25 total
Tests:       240 passed, 240 total
Snapshots:   0 total
Time:        19.711 s
exit 0

$ bun run lint
$ oxlint apps
exit 0 (no findings)

$ bun --filter @guzia/api build
@guzia/api build: Exited with code 0
exit 0
```

Targeted export spec
(`bun --filter @guzia/api test -- --runTestsByPath src/ai/tests/export/paper-export.spec.ts`):
**1 suite / 7 tests passed**, 4.203 s.

## Commit

84144ec80418cad400b13402a642b6496e95aea8

## Blockers

none

## Reflection

The previous round treated `cs` as the only Bengali slot. Word's `rFonts`
carries four slots and the archive's files set all four; `eastAsia` was the
missing one, and only unzipping both `document.xml` and `styles.xml` exposed it.
The font-licence half has the same lesson: "which Bengali face" is two
different questions for DOCX and PDF — a name reference costs nothing to the
reader, while an embedded face is a redistribution and must be OFL. Writing
that split down in the renderer comment and the result keeps the next round
from "fixing" the difference back.
