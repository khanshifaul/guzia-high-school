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
<recorded in the follow-up commit>
$ git ls-tree --name-only HEAD agents/critic/
<empty>
$ git status --porcelain agents/critic/
<empty>
$ gh pr view --json number,state,mergeable,baseRefName
<recorded in the follow-up commit>
```

No test was run: this change touches no `apps/` code and adds no executable
file, so `test-command` exercises nothing it changes. `zolly verify` may still
rewrite this section; if it does, its output supersedes the line above.

## Commit

<recorded in the follow-up commit>

## Blockers

none
