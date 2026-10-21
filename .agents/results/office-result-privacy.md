---
id: office-result-privacy
title: Remove a personal fact about the founder from the public result file
status: done
gate: auto
---

## Summary

The tracked result file `.agents/results/office-commands.md` (merged to `main` in
`fa20bd9`, PR #7) stated a personal fact about the founder at line 190,
in a repository that is **PUBLIC**. That sentence is gone; the paragraph now
records the tracking decision and its reason as a *category* ("personal notes")
and names neither the fact nor any file containing it.

The `.gitignore` comment that made this possible held a false belief — "It is
not committed to main" — and is corrected: a squash merge of the task branch
puts the result file on `main`, so a result file is public once merged.

The same false belief appeared in `.agents/results/office-commands.md`'s
"Accepted cost" bullet; it now states the merge consequence too.

Nothing under `apps/` touched. No `.gitignore` ignore rule added, removed or
reordered — only comment text changed (72 non-comment lines before and after,
byte-identical). The 6 `agents/critic/*.md` files were not edited, staged,
committed or discarded.

## Files changed

- `.agents/results/office-commands.md` — the personal fact removed; tracking
  decision and reason retained; result-file merge consequence stated.
- `.gitignore` — comment text only, lines 48-51. Ignore rules untouched.
- `.agents/results/office-result-privacy.md` — this result file.

## Verify

The condition's token is **deliberately not written in this file**: spelling it
out here would re-publish in the tracked tree exactly the string the scan is
meant to prove absent, and this file is public once merged. `<token>` below marks
where it was substituted. Every command is reproducible by substituting the word
from the brief.

```
$ git grep -n -w "<token>"                     # tracked tree on the branch
(no output)
exit=1          # exit 1 = no match

$ git grep -n -w "<token>" HEAD
(no output)
exit=1

$ git show HEAD:.agents/results/office-commands.md | grep -n -w "<token>"
(no output)
exit=1

$ git diff --name-only origin/main...HEAD
.agents/results/office-commands.md
.agents/results/office-result-privacy.md
.gitignore

$ git grep -in "<token>"
apps/api/prisma/generated/internal/class.ts:38:  graph: "1hTwAvAEDggAALsKACAJAAC6CgAgEQAAuQoAIK4FAAC2CgAwrwUAABEAELAFAAC2CgAwsQUBAAAAAbQFAAC3CqwGIrcFQADnCAAhywVAAOcIACHaBQEAAAAB-AU... (base64 run, generated Prisma client)
exit=0
```

The single case-insensitive hit is **the pre-existing generated Prisma client
blob** (`apps/api/prisma/generated/internal/class.ts:38`), a base64 string that
happens to contain the letter run. It is present at `0d4743c`
(`git cat-file -e 0d4743c:apps/api/prisma/generated/internal/class.ts` → yes),
predates this office work, is generated output, and was deliberately not edited.
No case-sensitive occurrence exists anywhere in the branch's tracked tree.

`origin/main` still carries the leak until this PR merges — that is the defect
being fixed, and the rewritten result file is the *only* place on main that
does:

```
$ git grep -n -w "<token>" origin/main
origin/main:.agents/results/office-commands.md:190:   (the sentence this PR deletes)
exit=0

$ git grep -n -w "<token>" origin/main -- . ":(exclude).agents/results/office-commands.md"
(no output)
exit=1
```

The merge commit itself is checked on the tree `git merge-tree --write-tree`
produces, i.e. exactly what a squash merge of this branch onto main would write:

```
$ tree=$(git merge-tree --write-tree origin/main HEAD | head -1); echo "$tree"
e45e294f87d9c7498ed3d84ffb478d0b50b83aaf
$ git grep -n -w "<token>" "$tree"
(no output)
exit=1
```

Scope and rule checks:

```
$ diff <(git show origin/main:.gitignore | grep -v '^#') <(grep -v '^#' .gitignore)
(no output)                     # ignore rules identical
$ git show origin/main:.gitignore | grep -c -v '^#'; grep -c -v '^#' .gitignore
72
72

$ git diff --name-only origin/main...HEAD -- apps/
(no output)

$ git status --short agents/critic/
(no output)                     # 6 critic files untouched

$ git status --short
(no output)
```

Test command (`.agents/rules/project.md` → `test-command`), run in this
worktree:

```
$ bun install --frozen-lockfile
1115 packages installed [10.43s]

$ bun run test
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/web test:  Test Files  2 passed (2)
@guzia/web test:       Tests  54 passed (54)
exit 0
```

## Commit

- `a202572506c8f2582d15393124c8c3106a3a68d0` —
  `docs(office): remove a personal fact from the public result file`
  (`.gitignore` + `.agents/results/office-commands.md`)
- this result file is committed in a follow-up commit on
  `foreman/office-result-privacy`, because a commit cannot contain its own SHA.

## Blockers

none — no dispatch refusal was hit on this task. The 6 `agents/critic/*.md`
files remain dirty in the main checkout by founder decision of 2026-10-22
(the founder's own WIP from 2026-10-19); they were not touched, staged,
committed or discarded.

## Root cause — recorded in my own words

Two faults combined, and each alone would have been harmless.

1. **The brief carried the sentence.** The foreman's brief for task
   `office-commands` told the worker to record the tracking decision *and why*,
   and worded that instruction with the personal fact spelled out. The worker
   wrote a faithful result. The leaked phrase originated in the brief, not in
   the worker's judgement; a brief is a source, and sources leak through
   deliverables.

2. **The `.gitignore` comment held a false belief.** It said a result file "is
   not committed to main", so the office treated results as branch-local and
   safe to write freely. A squash merge of a task branch puts
   `.agents/results/<id>.md` on `main` — that is exactly what happened in
   `5b77972` and again in `fa20bd9`. A result file is public the moment it
   merges. The comment now says so, so the next worker reads the rule where it
   bites.

The standing lesson: the founder's 2026-10-22 decision keeps the *office layer*
off the public repo because it holds personal notes, but a result file is not
the office layer — it is the one tracked deliverable of a task. It needs the
same discipline as the layer, and now it is told so in both files that describe
it.
