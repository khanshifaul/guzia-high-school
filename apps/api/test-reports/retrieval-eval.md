# Cross-source retrieval evaluation

Generated 2026-10-19T15:42:08.528Z · 5 labelled questions · metric: recall@k (expected source present in citations).

| # | Question | Expected | Returned | Hit | ms |
|---|---|---|---|---|---|
| 1 | What does the water cycle describe? | verify.txt | verify.txt, org.txt, org.txt, source-page.png, office-test.docx, notes.md | ✅ | 4089 |
| 2 | What do mitochondria produce? | office-test.docx | office-test.docx, source-page.png, verify.txt, org.txt, org.txt, notes.md | ✅ | 1486 |
| 3 | সালোকসংশ্লেষণ কীভাবে কাজ করে? | source-page.png | org.txt, org.txt, notes.md, verify.txt, source-page.png, office-test.docx | ✅ | 3073 |
| 4 | What is the discriminant of a quadratic equation? | notes.md | org.txt | notes.md, org.txt, org.txt, verify.txt, source-page.png, office-test.docx | ✅ | 2182 |
| 5 | How are quadratic equations solved? | notes.md | org.txt | notes.md, org.txt, org.txt, verify.txt, office-test.docx, source-page.png | ✅ | 2778 |

**Recall@k: 5/5 (100%)**

> Small, hand-labelled set over the current demo corpus. It measures retrieval
> (did the right source surface), not answer faithfulness.
