---
id: office-bootstrap
title: Commit the office wiring files and fix the persona commands
status: done
gate: auto
---

## Summary

Committed the four office wiring files (`.gitignore`, `AGENTS.md`, `HANDOFF.md`,
`OPEN-QUESTIONS.md`) on `foreman/office-bootstrap` and opened a PR against
`main`. Applied six measured command fixes to the office personas in the
**main checkout** (`.agents/`); they are deliberately untracked there, per the
founder's decision of 2026-10-22 that the office layer stays off this public
repo. The six `agents/critic/*.md` files were not edited, staged, committed or
discarded.

## Files changed

- `.gitignore` — adds the office runtime block and the block that ignores the
  office layer directories.
- `AGENTS.md` — adds `## Zolly office context` with the 5 `@.agents/…` tokens.
- `HANDOFF.md` — new; stock template.
- `OPEN-QUESTIONS.md` — new; header only.
- `.agents/results/office-bootstrap.md` — this result file (on the branch by
  contract).

The wiring commit `50e8bda` changes exactly the first four (`git show
--name-only 50e8bda`). This result file is a second commit on the same branch,
so `git diff --name-only origin/main...HEAD` lists these five paths and
nothing else. The task's "four and only four" is read as "the wiring commit
carries four and only four", because the same task requires this result file
committed on the branch and no other `.agents/` file in the diff.

## Verify

```
$ bun install --frozen-lockfile
1115 packages installed [10.25s]

$ bun run test
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/web test:  Test Files  2 passed (2)
@guzia/web test:       Tests  54 passed (54)
exit 0
```

```
$ git show --name-only --format='%h %s' 50e8bda
50e8bda chore(office): commit the office wiring files and ignore the office layer

.gitignore
AGENTS.md
HANDOFF.md
OPEN-QUESTIONS.md
```

```
$ git diff --name-only origin/main...HEAD
.agents/results/office-bootstrap.md
.gitignore
AGENTS.md
HANDOFF.md
OPEN-QUESTIONS.md
```

## Commit

- wiring commit: `50e8bda2963c23551d7bff7d3a0fd385bae70e09`
- result file: the second commit on `foreman/office-bootstrap` (the branch tip
  that carries this file; a commit cannot name its own SHA)

## Blockers

Verbatim refusal from `zolly foreman "<probe>"`, run in the main checkout at
`/home/khan/Projects/school/guzia-high-school` on 2026-10-22:

```
Error: refusing to touch main: it has uncommitted tracked changes — .gitignore, AGENTS.md, agents/critic/00-orchestrator.md, agents/critic/01-guest-public.md, agents/critic/02-admin.md, agents/critic/03-teacher.md, agents/critic/04-student.md, agents/critic/05-parent.md, HANDOFF.md
```

That refusal is the accepted state, not a fault. The six `agents/critic/*.md`
files are the founder's own WIP from 2026-10-19 and stay dirty by the founder's
decision of 2026-10-22. Three files in the refused list (`.gitignore`,
`AGENTS.md`, `HANDOFF.md`) belong to this branch and become clean when the
reviewer merges it; the remaining dirty set will then be the six critic files,
so `ensure_main_matches_origin` → `check_main_clean` will keep refusing
dispatch and `zolly close` will keep refusing. Do not bypass or work around
that guard.

## Persona fixes applied in the main checkout (deliberately untracked)

All under `/home/khan/Projects/school/guzia-high-school/.agents/`. Untracked,
unstaged, uncommitted — founder decision 2026-10-22: the office layer stays off
this public repo. Line numbers are post-edit.

### Fix A — `herdr worktree create` needs `--cwd`

Without `--cwd` herdr resolves `--base origin/main` in its own cwd and dies
`fatal: invalid reference: origin/main`.

| File:line | Before | After |
|---|---|---|
| `.agents/foreman/agent.md:61` | `herdr worktree create --branch foreman/<task-id> --base origin/main --path .agents/worktrees/<task-id>` | `herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path .agents/worktrees/<task-id>` |
| `.agents/foreman/agent.md:103` | same as above | same as above |
| `.agents/foreman/rules/extensions.md:41` | same as above | same as above |

### Fix B — the reviewer reads the branch diff, not `git diff`

Plain `git diff` in a worktree shows uncommitted working-tree changes only and
returns empty once the worker has committed.

| File:line | Before | After |
|---|---|---|
| `.agents/foreman/agent.md:155` | `Diff: run 'git diff' in the worktree.` | `Diff: run 'git diff origin/main...HEAD' in the worktree.` |
| `.agents/foreman/rules/extensions.md:64` | `Diff: run 'git diff' in the worktree.` | `Diff: run 'git diff origin/main...HEAD' in the worktree.` |
| `.agents/reviewer/agent.md:36` | `2. Read the worktree diff (\`git diff\` in \`.agents/worktrees/<task-id>/\`)` | `2. Read the worktree diff (\`git diff origin/main...HEAD\` in \`.agents/worktrees/<task-id>/\`)` |

### Fix C — `gh pr checks` without `--required`

`main` has no branch protection, so `--required` exits 1 with "no required
checks reported" and cannot distinguish pass from fail.

| File:line | Before | After |
|---|---|---|
| `.agents/reviewer/agent.md:64` | `gh pr checks <pr-number> --required` | `gh pr checks <pr-number>` |
| `.agents/reviewer/agent.md:75` | `re-check until the required checks conclude` | `re-check until the checks conclude` |

### Fix D — the worker herdr agent name is abbreviated

herdr caps an agent name at 32 characters. `worker-guzia-high-school-` is
already 25, so any task id longer than 7 characters exceeds the cap and
`herdr agent start` fails with `invalid_agent_name`. The agent name uses a
short id of at most 7 characters; the radio handle, queue path, branch, result
file and worktree path keep the full task id. The constraint is recorded once
per file, beside the seat names
(`.agents/foreman/agent.md:48-51`, `.agents/foreman/rules/extensions.md:29-32`,
`.agents/zolly/rules/extensions.md:67-70`).

| File:line | Before | After |
|---|---|---|
| `.agents/zolly/rules/extensions.md:63` | worker row `worker-guzia-high-school-<task-id>` | worker row `worker-guzia-high-school-<short-id>` |
| `.agents/foreman/agent.md:44` | `A worker's herdr name is \`worker-guzia-high-school-<task-id>\`` | `A worker's herdr name is \`worker-guzia-high-school-<short-id>\`` |
| `.agents/foreman/agent.md:64` | `herdr agent start worker-guzia-high-school-<task-id> --kind omp --pane <pane-id>` | `herdr agent start worker-guzia-high-school-<short-id> --kind omp --pane <pane-id> -- --model commandcode/deepseek/deepseek-v4.1-flash:auto` |
| `.agents/foreman/agent.md:111` | `herdr agent start worker-guzia-high-school-<task-id> --kind omp --pane <pane-id>` | `herdr agent start worker-guzia-high-school-<short-id> --kind omp --pane <pane-id> -- --model commandcode/deepseek/deepseek-v4.1-flash:auto` |
| `.agents/foreman/agent.md:112` | `zolly worker-brief worker-guzia-high-school-<task-id> …` | `zolly worker-brief worker-guzia-high-school-<short-id> …` |
| `.agents/foreman/rules/extensions.md:23` | worker row `worker-guzia-high-school-<task-id>` | worker row `worker-guzia-high-school-<short-id>` |
| `.agents/foreman/rules/extensions.md:42` | `herdr agent start worker-guzia-high-school-<task-id> --kind omp --pane <pane-id>` | `herdr agent start worker-guzia-high-school-<short-id> --kind omp --pane <pane-id> -- --model commandcode/deepseek/deepseek-v4.1-flash:auto` |
| `.agents/foreman/rules/extensions.md:43` | `zolly worker-brief worker-guzia-high-school-<task-id> …` | `zolly worker-brief worker-guzia-high-school-<short-id> …` |

Two sites beyond the seven named in the brief carry the same defect and were
fixed the same way: `.agents/foreman/agent.md:64` (the inline dispatch example
in "What you do" step 3) and `.agents/foreman/agent.md:141` (the reviewer's
`herdr agent start`). Both are literal commands; leaving them would keep the
office broken.

### Fix E — `herdr agent start` needs an explicit `-- --model`

With no model argument the agent inherits the account default, starts, takes
the brief, and then dies on its first turn with
`MODEL_NOT_IN_PLAN: Claude Sonnet 5 ...` while the dispatch still looks healthy.

| File:line | Before | After |
|---|---|---|
| `.agents/foreman/agent.md:64` | `herdr agent start worker-guzia-high-school-<short-id> --kind omp --pane <pane-id>` | `herdr agent start worker-guzia-high-school-<short-id> --kind omp --pane <pane-id> -- --model commandcode/deepseek/deepseek-v4.1-flash:auto` |
| `.agents/foreman/agent.md:111` | same as above | same as above |
| `.agents/foreman/agent.md:141` | `herdr agent start pr-reviewer-guzia-high-school --kind omp --pane <pane-id>` | `herdr agent start pr-reviewer-guzia-high-school --kind omp --pane <pane-id> -- --model commandcode/deepseek/deepseek-v4.1-flash:auto` |
| `.agents/foreman/rules/extensions.md:42` | same as the worker command | same as above |

`commandcode/deepseek/deepseek-v4.1-flash:auto` is the model the office's own
`plan` role already uses. `kilo/kilo-auto/free` was deliberately not used: it
can route to a reasoning model that spends the `max_tokens` budget on reasoning
and returns empty content (`specs/10-ai-teacher-toolkit.md:59-63`).

## Agent-name mapping

| Thing | Value |
|---|---|
| task id (queue, branch, result, worktree, radio) | `office-bootstrap` |
| short id | `ob` |
| herdr agent name | `worker-guzia-high-school-ob` (27 chars) |

The task id stays `office-bootstrap` everywhere: queue
`.agents/queue/office-bootstrap.md`, branch `foreman/office-bootstrap`, result
`.agents/results/office-bootstrap.md`, worktree
`.agents/worktrees/office-bootstrap/`, radio handle `worker-office-bootstrap`.
Only the herdr agent name is abbreviated: herdr caps an agent name at 32
characters and `worker-guzia-high-school-` is 25, so the full name
`worker-guzia-high-school-office-bootstrap` (41 chars) can never be used.
