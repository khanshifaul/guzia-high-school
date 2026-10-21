---
id: office-brief-decontaminate
title: Decontaminate the briefs and notes that carried a personal fact
status: done
gate: auto
---

## Summary

Removed the personal fact from every office source file that carried it — the
queue brief, six inbox notes/replies, the memory store, the zolly persona, the
curiosity prompt, and the pre-install backup copy — and replaced each with the
category. Added the brief-as-source invariant to
`.agents/rules/queue-contract.md`, where the brief's shape is fixed. The public
tracked tree was already clean and remains clean. The office layer is
untracked, so the rule and the cleanups live in the main checkout; only this
result file rides the branch.

The fact is not spelled in this file. Before-snippets use `<the-token>`.

## Files changed

- `.agents/results/office-brief-decontaminate.md` (this file, on the branch)

Edited in the **main checkout**, untracked, unstaged, not committed (the
office layer is ignored by the founder's 2026-10-22 decision; see below):

- `.agents/rules/queue-contract.md` — the rule addition
- the queue brief, inbox notes, memory, persona, prompt and backup files
  listed under "Cleaned files"

`git ls-files .agents/rules/` prints nothing, so the rules file cannot ride a
branch without forcing an ignored path onto the public repo. That is forbidden
by the brief and by the founder's decision, so the rule stays where every other
office-layer edit lives: the main checkout's untracked copy. `git add -f` was
not used and `.gitignore` was not edited.

## Verify

### Scan before cleanup (whole word, case-insensitive)

```bash
grep -rIlw -i '<the-token>' .agents/queue .agents/inbox .agents/rules
```

I ran the equivalent scan programmatically so the token never entered a
command line. It returned these files:

- `.agents/queue/office-result-privacy.md`
- `.agents/inbox/note-zolly-office-commands.md`
- `.agents/inbox/note-zolly-privacy-leak.md`
- `.agents/inbox/reply-pr-reviewer-131.md`
- `.agents/inbox/reply-pr-reviewer-49.md`
- `.agents/inbox/reply-pr-reviewer-76.md`
- `.agents/inbox/review-office-result-privacy.md`

A whole-tree scan outside `apps/` found five more office sources that carried
it — `.agents/memory/{personality,decisions,learnings}.md`,
`.agents/prompts/curiosity.md`, `.agents/zolly/agent.md` — and three copies
inside `.agents-backup-20261021T201944Z/`. All were cleaned. The `.agents/rules/`
directory was already clean.

### Scan after cleanup

```bash
grep -rIlw -i '<the-token>' .agents/queue .agents/inbox .agents/rules 2>/dev/null
```

-> no output (exit 1). The required scope is empty.

```text
whole-tree whole-word scan (main checkout, excluding apps/, .git/, node_modules/):
  before: 12 office files + 3 backup files
  after:  0
```

Two substring-only hits remain and are untouched, neither an office source:

- `apps/api/prisma/generated/internal/class.ts` — a base64 blob in the
  GENERATED Prisma client, present at the pre-office commit `0d4743c` and
  tracked on `main` before this work. It is a substring, not a whole word, and
  the file is generated output under `apps/`.
- `.gitnexus/lbug` — the machine-local graph index (derived, untracked). It
  contains the bytes, not an office source file; the graph is not used by this
  office (`gitnexus: off` in `rules/project.md`).

### Tracked tree of the public repo

```bash
git ls-files .agents/rules/
# (no output)

git grep -n -w '<the-token>' origin/main
# (no output; exit 1)
```

The tracked tree was already clean after PR #8 and is still clean.

### Tests

```bash
bun install --frozen-lockfile && bun run test
```

```text
1115 packages installed [11.19s]
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/api test: Exited with code 0
@guzia/web test:  Test Files  2 passed (2)
@guzia/web test:       Tests  54 passed (54)
@guzia/web test: Exited with code 0
```

## Cleaned files

Before-snippets substitute `<the-token>` for the fact.

**Queue brief**

- `.agents/queue/office-result-privacy.md:20-22` — "The string `<the-token>`
  does not appear anywhere…" → "The personal fact this task removes does not
  appear anywhere…"; scan command now uses `<the-token>`.
- `:45` — "…`memory/founder.md` and `memory/personality.md` are personal notes,
  and several office files mention the founder has `<the-token>`." → "…personal
  notes, including personal health information."
- `:66` — `include "several office files mention the founder has <the-token>"` →
  `include the personal fact itself`.
- `:158,163,167` — scan commands now use `<the-token>`.

**Memory store**

- `.agents/memory/personality.md:31` — "design for a distracted founder
  (`<the-token>`)" → "design for a distracted founder".
- `.agents/memory/decisions.md:20` — "…including three files that mention the
  founder has `<the-token>`." → "…including personal health information." The
  decision, its owner and the accepted cost are unchanged.
- `.agents/memory/learnings.md:21` — "carried three files mentioning the founder
  has `<the-token>` plus personal notes in `memory/founder.md` and
  `memory/personality.md`" → "carried personal notes, including personal health
  information".
- `:120` (L-0024) — "the correct `<the-token>`-privacy check" → "the correct
  personal-fact privacy check"; scan examples use `<the-token>`.
- `:125` (L-0025) — "wrote 'several office files mention the founder has
  `<the-token>`' into a PUBLIC repo" → "wrote a personal health detail into a
  PUBLIC repo".

**Persona and prompt**

- `.agents/zolly/agent.md:94` — "…low working memory — the founder has
  `<the-token>`." → "…low working memory."
- `.agents/prompts/curiosity.md:74` — "The founder may be context-switching and
  has `<the-token>`." → "The founder may be context-switching."

**Inbox notes and replies** (machine-local, never published)

- `.agents/inbox/note-zolly-office-commands.md:7` — the parenthetical naming
  three files and the condition → "including personal health information";
  `:15` — "the reviewer's `<the-token>` correction" → "personal-fact
  correction"; scan example uses `<the-token>`.
- `.agents/inbox/note-zolly-privacy-leak.md:3` — the quoted leak sentence →
  "a personal health detail about the founder"; `:9` — scan example uses
  `<the-token>`.
- `.agents/inbox/reply-pr-reviewer-49.md:12` — "(3+ files mention the founder
  has `<the-token>`)" → "including personal health information"; "0
  `<the-token>` mentions" → "0 personal-fact mentions".
- `.agents/inbox/reply-pr-reviewer-76.md:58` — "your `<the-token>` correction"
  → "your personal-fact correction"; `:60,62,64,67` — scan examples use
  `<the-token>`.
- `.agents/inbox/review-office-result-privacy.md:19` — scan example uses
  `<the-token>`.
- `.agents/inbox/reply-pr-reviewer-131.md:1` — scan example uses
  `<the-token>`.

**Backup snapshot** — cleaned in place, not moved to `.agents/trash/`:

- `.agents-backup-20261021T201944Z/memory/personality.md:31`
- `.agents-backup-20261021T201944Z/prompts/curiosity.md:74`
- `.agents-backup-20261021T201944Z/zolly/agent.md:76`

Each got the same replacement as its live counterpart. The snapshot stays a
snapshot of everything else; the three contaminated copies are now category-only.

## Rule added

`.agents/rules/queue-contract.md:41-46` — new section "A brief is a source":

> A brief is a source. Whatever it names, a worker can carry into a result
> file, and a result file can be merged into a public repo. Name the decision
> and the paths; never name the personal content behind them — not even to
> illustrate the rule.

The brief-side bullet in the template's `## Context` guidance
(`.agents/rules/queue-contract.md:35-38`) was already present and is unchanged.

Checked for the fact, no correction needed:

- `.agents/rules/result-contract.md:69` — says "the founder's personal health
  detail", a category.
- `.agents/rules/result-contract.md:93` — "The same rule, one layer up: the
  brief".
- `.agents/reviewer/agent.md:194` — lists category examples ("health,
  neurodivergence, …"), names no condition.

## Commit

`80f1960` (`80f1960fec0e68280c3491113cf2b1d535f55ec4`) — the commit that adds
this result file. A trailing record commit updates this line; no file outside
`.agents/results/` is touched.

## Blockers

None.

The 6 `agents/critic/*.md` files remain dirty by founder decision. They were
not touched, not committed, and not discarded.
