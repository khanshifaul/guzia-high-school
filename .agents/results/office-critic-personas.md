---
id: office-critic-personas
title: Retire the six critic briefs, land HANDOFF.md, add results/.gitkeep
status: done
gate: auto
---

## Summary

The six `agents/critic/0*.md` briefs are retired: each one's content now lives
as a worker persona under `.agents/worker/critic*.md`, so the repo copies were
superseded duplicates. `HANDOFF.md` in the primary checkout was landed verbatim
(byte-identical, 106 lines) so that checkout's day-close section is committed
rather than held in an uncommitted modification. An empty
`.agents/results/.gitkeep` was added so the results directory exists in a fresh
worktree before any task has written a result.

Docs-only. No application code, no `apps/` changes, no migration. The
`agents/critic/report-*.md` generated outputs stay untracked and unadded.

## Files changed

- `agents/critic/00-orchestrator.md` (deleted)
- `agents/critic/01-guest-public.md` (deleted)
- `agents/critic/02-admin.md` (deleted)
- `agents/critic/03-teacher.md` (deleted)
- `agents/critic/04-student.md` (deleted)
- `agents/critic/05-parent.md` (deleted)
- `HANDOFF.md` (verbatim copy of the primary checkout's file)
- `.agents/results/.gitkeep` (new, zero bytes)
- `.agents/results/office-critic-personas.md` (this file)

## Verify

Measured in the worktree
`/home/khan/Projects/school/guzia-high-school/.agents/worktrees/office-critic-personas`.

Inputs re-measured before starting, not assumed:

```
$ git rev-parse HEAD
696bd9f240b80c5bd066ce33450e0178e3ef5664
$ wc -l /home/khan/Projects/school/guzia-high-school/HANDOFF.md
106 /home/khan/Projects/school/guzia-high-school/HANDOFF.md
$ git ls-tree --name-only origin/main agents/critic/
agents/critic/00-orchestrator.md
agents/critic/01-guest-public.md
agents/critic/02-admin.md
agents/critic/03-teacher.md
agents/critic/04-student.md
agents/critic/05-parent.md
```

The copy is verbatim:

```
$ cmp /home/khan/Projects/school/guzia-high-school/HANDOFF.md HANDOFF.md && echo 'cmp exit 0'
cmp exit 0
$ wc -l HANDOFF.md
106 HANDOFF.md
$ wc -c .agents/results/.gitkeep
0 .agents/results/.gitkeep
```

Acceptance checks:

```
$ git diff --stat origin/main...HEAD
 .agents/results/.gitkeep                  |   0
 .agents/results/office-critic-personas.md |  88 +++++++++++++++++++++
 HANDOFF.md                                | 103 +++++++++++++++++++++++--
 agents/critic/00-orchestrator.md          |  56 --------------
 agents/critic/01-guest-public.md          |  68 -----------------
 agents/critic/02-admin.md                 | 119 -----------------------------
 agents/critic/03-teacher.md               | 123 ------------------------------
 agents/critic/04-student.md               |  94 -----------------------
 agents/critic/05-parent.md                |  80 -------------------
 9 files changed, 186 insertions(+), 545 deletions(-)
$ git ls-tree --name-only HEAD agents/critic/
(no output)
$ git status --porcelain agents/critic/
(no output)
$ git ls-tree -r --name-only HEAD agents/critic/ | grep -c 'report-'
0
```

The diff stat above is the first commit (`dde45a1`). The follow-up commit only
edits this file, so `git diff --stat origin/main...HEAD` still lists these nine
paths and no others.

PR state, read after the branch was pushed:

```
$ gh pr view 28 --json number,state,mergeable,baseRefName,headRefName,url
{"baseRefName":"main","headRefName":"foreman/office-critic-personas","mergeable":"MERGEABLE","number":28,"state":"OPEN","url":"https://github.com/khanshifaul/guzia-high-school/pull/28"}
```

`mergeStateStatus` was `UNSTABLE` at that reading — checks still in progress,
which is not a conflict. Mergeability is `MERGEABLE`.

The project's `test-command`, run in a fresh worktree (no `node_modules/`
existed there before this run):

```
$ bun install --frozen-lockfile && bun run test
$ echo "test-command exit: $?"
test-command exit: 0
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/web test:  Test Files  2 passed (2)
@guzia/web test:       Tests  54 passed (54)
```

This is a docs-only change, so the suite passing is a guard against an
accidental tree change, not proof the change works; the acceptance commands
above are that proof.

## Commit

- first commit, work + this result file: `dde45a1355a4f4f16657ee83bd09a7324e50d09a`
  (`docs(office): retire the six critic briefs, land HANDOFF.md and results/.gitkeep`)
- the follow-up commit on the same branch records that SHA and the PR reading
  above, because a commit cannot name its own.

## Blockers

none
