---
id: paper-export-fonts
title: Switch paper export fonts — Times New Roman/Kalpurush DOCX, Liberation Serif/Kalpurush PDF
status: done
gate: auto
---

## Summary

Replaced the single Noto Sans Bengali export face with the design's split:
DOCX runs use `w:ascii`/`w:hAnsi` Times New Roman and `w:cs` Kalpurush, with
`w:sz` and `w:szCs` mirrored on every run and in `docDefaults`; the Typst PDF
uses the tuple `("Liberation Serif", "Kalpurush")`. Legacy Noto assets and
their licence were removed, and both replacement faces are vendored in the
repo with their licences.

## Fonts shipped

| File | Bytes | sha256 | Licence |
|---|---:|---|---|
| `apps/api/assets/fonts/Kalpurush0.258ship.ttf` | 314,592 | `83613a03e53aad8337f2be9fb974409a23c1d99b3b4b494567ba9d156c492b01` | SIL OFL 1.1, Copyright (c) 2022 Tanbin Islam Siyam, Reserved Font Name Kalpurush (`Kalpurush-LICENSE.txt`) |
| `apps/api/assets/fonts/LiberationSerif-Regular.ttf` | 393,692 | `86b9ea1c2f41bed9d7c09ccad4abc2894b33df5de60e5bbbece5d48610911870` | SIL OFL 1.1, Red Hat/Google, Reserved Font Name Liberation (`LiberationSerif-LICENSE.txt`) |
| `apps/api/assets/fonts/LiberationSerif-Bold.ttf` | 370,196 | `28f2d4300ee366d1ff9ca95df967a27e77987c87857fad0d9c85034405aae39d` | SIL OFL 1.1, Red Hat/Google, Reserved Font Name Liberation (`LiberationSerif-LICENSE.txt`) |

Sources: `Kalpurush0.258ship.ttf` from
`https://raw.githubusercontent.com/potasiyam/Kalpurush/master/release/Kalpurush0.258ship.ttf`
and `Kalpurush-LICENSE.txt` from the same repository's `LICENSE`. Liberation
Serif files and `LICENSE` come from the Arch `ttf-liberation` 2.1.5-2 package
(upstream liberation-fonts 2.1.5); they are the same files installed at
`/usr/share/fonts/liberation/`.

The old Noto assets are gone: `NotoSansBengali-Regular.ttf`,
`NotoSansBengali-Bold.ttf`, `NotoSansBengaliUI-Regular.ttf`,
`NotoSansBengaliUI-Bold.ttf`, and the Noto `OFL.txt`. Git reports
`OFL.txt -> Kalpurush-LICENSE.txt` as a rename because both are OFL texts; the
tracked content is the Kalpurush licence from upstream, whose copyright line
differs from Noto's.

## Files changed

- `apps/api/src/ai/tests/export/docx.renderer.ts`
- `apps/api/src/ai/tests/export/pdf.renderer.ts`
- `apps/api/src/ai/tests/export/paper-export.spec.ts`
- `apps/api/Dockerfile` (comments only; it already copied the font directory)
- `apps/api/assets/fonts/Kalpurush0.258ship.ttf` (added)
- `apps/api/assets/fonts/Kalpurush-LICENSE.txt` (added)
- `apps/api/assets/fonts/LiberationSerif-Regular.ttf` (added)
- `apps/api/assets/fonts/LiberationSerif-Bold.ttf` (added)
- `apps/api/assets/fonts/LiberationSerif-LICENSE.txt` (added)
- `apps/api/assets/fonts/NotoSansBengali-{Regular,Bold}.ttf` (deleted)
- `apps/api/assets/fonts/NotoSansBengaliUI-{Regular,Bold}.ttf` (deleted)
- `apps/api/assets/fonts/OFL.txt` (deleted)

## DOCX XML assertions

Rendered from the final source (`mcqFixture`, 30 items; `/tmp/final-mcq.docx`,
11,343 bytes):

```
$ unzip -p /tmp/final-mcq.docx word/document.xml | grep -o '<w:rFonts[^/]*/>' | sort | uniq -c
    427 <w:rFonts w:ascii="Times New Roman" w:cs="Kalpurush" w:hAnsi="Times New Roman"/>

$ unzip -p /tmp/final-mcq.docx word/document.xml | grep -o '<w:sz[^/]*/>\|<w:szCs[^/]*/>' | sort | uniq -c
    331 <w:szCs w:val="17"/>
      1 <w:szCs w:val="18"/>
     91 <w:szCs w:val="19"/>
      2 <w:szCs w:val="20"/>
      1 <w:szCs w:val="24"/>
      1 <w:szCs w:val="30"/>
    331 <w:sz w:val="17"/>
      1 <w:sz w:val="18"/>
     91 <w:sz w:val="19"/>
      2 <w:sz w:val="20"/>
      1 <w:sz w:val="24"/>
      1 <w:sz w:val="30"/>

$ unzip -p /tmp/final-mcq.docx word/styles.xml | grep -o '<w:docDefaults>.*</w:docDefaults>'
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Kalpurush" w:hAnsi="Times New Roman"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>
```

Every run has a `w:rFonts`, and every `w:sz` has a matching `w:szCs` at the
same half-point value (427 each). `word/document.xml` has 30 numbered runs
and `<w:cols ... w:num="2"/>`. `unzip -p ... '*.xml'` has 0 matches for
`SutonnyMJ|Bijoy|Noto Sans Bengali`.

## PDF output

| Fixture | PDF bytes | `pdfinfo` pages | Page size | `[‡†½¼¾ƒ]` matches |
|---|---:|---:|---|---:|
| 30 MCQ | 66,948 | 1 | 595.276 × 841.89 pt (A4) | 0 |
| 70-mark creative | 51,186 | 1 | 595.276 × 841.89 pt (A4) | 0 |

The extracted MCQ text contains the header and 30 numbered items.

`pdftotext /tmp/final-mcq.pdf -` excerpt:

```
গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়
বার্ষিক পরীক্ষা ২০২৬

নবম শ্রেণি · গণিত
সময় ৩০ মিনিট · পূপূ র্ণমান ৩০
নাম: ………………………………… রোল: …………………………
প্রশ্নপত্রে ৩০টি বহুনির্বাচনি প্রশ্ন রয়েছে। প্রতিটি প্রশ্নের মান ১।

১. নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:
১ + ১ = কত?
ক) প্রথম

খ) দ্বিতীয়

গ) তৃতৃতীয়

ঘ) চতুতুর্থ
```

Kalpurush's glyph→Unicode reverse map makes poppler emit some conjuncts and
vowel signs twice (`পূর্ণমান` → `পূপূ র্ণমান`, `তৃতীয়` → `তৃতৃতীয়`,
`চতুর্থ` → `চতুতুর্থ`). The rasterized page (`pdftoppm -r 150`) shows the
header and options shaped correctly; this is an extraction artifact, not a
rendering one. The spec asserts the stable header lines (`গুজিয়া দ্বিপাক্ষিক
উচ্চ বিদ্যালয়`, `সময় ৩০ মিনিট`, `প্রশ্নপত্রে ৩০টি বহুনির্বাচনি প্রশ্ন
রয়েছে`) plus all 30 numbered items, rather than pinning the duplicated
extraction.

## Verify

```
$ bun install --frozen-lockfile
1117 packages installed [7.56s]
exit 0

$ bun --filter @guzia/api test
Test Suites: 25 passed, 25 total
Tests:       240 passed, 240 total
Snapshots:   0 total
Time:        17.561 s
exit 0

$ bun run lint
$ oxlint apps
exit 0 (no findings)

$ bun --filter @guzia/api build
@guzia/api build: Exited with code 0
exit 0
```

Targeted export spec: 7 passed, 7 total.

## Commit

a5e0c1b8d3935ecbf32db12583cf64a2dea51652

## Blockers

none

## Reflection

The Kalpurush file's cmap maps a shaped conjunct glyph back to more than one
Unicode sequence, so `pdftotext` duplicates some matras/conjuncts even though
the visual page is correct. The test now checks
the header text that extracts cleanly plus every item number; pinning the
corrupted strings would make the test depend on a poppler/font quirk rather
than the paper. The DOCX side has no such issue: all runs and `docDefaults`
carry the exact `rFonts`/`sz`/`szCs` shape, verified from the unzipped XML.
