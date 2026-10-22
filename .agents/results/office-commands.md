---
id: office-commands
title: Fix the --path resolution in the worktree command and record the tracking decision
status: done
gate: auto
---

## Summary

Applied the one open command fix to the foreman personas in the **main
checkout** (`.agents/`): `herdr worktree create --path` now resolves to an
absolute path anchored on the repo root, at all three sites, with the
`--cwd` / `--path` coupling stated beside them. Measured the fix from a foreign
cwd: relative `--path` landed a worktree outside/wrong (`/tmp/.agents/...`,
`apps/api/.agents/...`), absolute `--path` landed at
`<repo>/.agents/worktrees/<id>` in both cases. The other three command fixes
routed to this task were already in place and were not re-applied. Recorded the
founder's decision that `.agents/` stays untracked. This result file is the only
path this branch changes.

## Files changed

- `.agents/results/office-commands.md` — this result file, committed on
  `foreman/office-commands`.

The three persona edits are in the **main checkout**
`/home/khan/Projects/school/guzia-high-school/.agents/`, deliberately untracked
(founder decision, 2026-10-22). They cannot ride a branch and were not staged,
not committed and not `git add -f`'d:

```
$ git check-ignore -v .agents/foreman/agent.md .agents/foreman/rules/extensions.md
.gitignore:56:.agents/foreman/	.agents/foreman/agent.md
.gitignore:56:.agents/foreman/	.agents/foreman/rules/extensions.md
```

No file under `apps/` touched. `agents/critic/*.md` (6 files) not edited,
staged, committed or discarded. `.gitignore` not edited.

## Verify

```
$ bun install --frozen-lockfile
1115 packages installed [10.26s]
exit 0

$ bun run test
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/web test:  Test Files  2 passed (2)
@guzia/web test:       Tests  54 passed (54)
exit 0
```

`--path` measurement, all four probes run 2026-10-22, same repo, same
`origin/main` base (`5b77972`):

```
# A — BUG: relative --path, invoked from a repo subdirectory
$ cd apps/api && herdr worktree create --cwd "$(git rev-parse --show-toplevel)" \
    --branch probe/relpath-1 --base origin/main --path .agents/worktrees/probe-relpath-1
-> git worktree list:
/home/khan/Projects/school/guzia-high-school/apps/api/.agents/worktrees/probe-relpath-1  [probe/relpath-1]
   WRONG: inside the repo tree but not at <repo>/.agents/worktrees/, so
   `zolly close probe-relpath-1` misses it and the branch is never cleaned up.

# B — FIX: absolute --path, same cwd
$ cd apps/api && herdr worktree create --cwd "$(git rev-parse --show-toplevel)" \
    --branch probe/abspath-1 --base origin/main \
    --path "$(git rev-parse --show-toplevel)/.agents/worktrees/probe-abspath-1"
-> /home/khan/Projects/school/guzia-high-school/.agents/worktrees/probe-abspath-1  CORRECT

# C — FIX with a literal absolute path, invoked from outside the repo
$ cd /tmp && herdr worktree create --cwd /home/khan/Projects/school/guzia-high-school \
    --branch probe/abspath-tmp --base origin/main \
    --path /home/khan/Projects/school/guzia-high-school/.agents/worktrees/probe-abspath-tmp
-> /home/khan/Projects/school/guzia-high-school/.agents/worktrees/probe-abspath-tmp  CORRECT

# D — BUG: relative --path, invoked from outside the repo
$ cd /tmp && herdr worktree create --cwd /home/khan/Projects/school/guzia-high-school \
    --branch probe/relpath-tmp --base origin/main --path .agents/worktrees/probe-relpath-tmp
-> /tmp/.agents/worktrees/probe-relpath-tmp  WRONG: outside the repo entirely
```

Cleanup, all four probes gone:

```
$ git worktree remove --force <each path>; git branch -D probe/... (x4)
Deleted branch probe/relpath-1 (was 5b77972).
Deleted branch probe/abspath-1 (was 5b77972).
Deleted branch probe/abspath-tmp (was 5b77972).
Deleted branch probe/relpath-tmp (was 5b77972).

$ git worktree list
/home/khan/Projects/school/guzia-high-school                                   5b77972 [main]
/home/khan/Projects/school/guzia-high-school/.agents/worktrees/office-commands 5b77972 [foreman/office-commands]

$ git branch --list 'probe/*'      # empty
$ ls -d /tmp/.agents               # No such file or directory
$ herdr worktree list | grep path  # only the two above
```

One honest qualification on the corrected form: `git rev-parse --show-toplevel`
itself fails outside any git repo (`cd /tmp` → `fatal: not a git repository`),
so the corrected command is correct from **any cwd inside the repo** —
including repo subdirectories and other worktrees, which is where the foreman
runs. From a cwd that is not in a repo at all, the literal absolute path (probe
C) is the only form that works.

## Commit

- result file, content: `ca569b1349bb371abb2e91d201b43512a9520818`
  (`docs(office): record the --path fix and the tracking decision`)
- this SHA was recorded by the follow-up commit on `foreman/office-commands`,
  because a commit cannot name its own SHA. Both commits touch only this file.

## Blockers

none — no dispatch refusal was hit on this task. The 6 `agents/critic/*.md`
files remain dirty in the main checkout by founder decision of 2026-10-22
(the founder's own WIP from 2026-10-19); they were not touched.

## Persona edits applied in the main checkout (deliberately untracked)

All under `/home/khan/Projects/school/guzia-high-school/.agents/`. Line numbers
are post-edit.

### Edit 1 — `.agents/foreman/agent.md:73` ("What you do" step 2)

Before:

```
`herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path .agents/worktrees/<task-id>`
```

After:

```
`herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"`
```

Coupling note added immediately after, `.agents/foreman/agent.md:76-79`:

```
`--cwd` fixes where the **base ref** is resolved; `--path` resolves against
the cwd of the invoking shell. Both are anchored to the repo root here so
the worktree lands inside the repo no matter where the command is run from.
A worktree created outside the repo is silently missed by `zolly close`.
```

### Edit 2 — `.agents/foreman/agent.md:120` ("Worker pattern" step 1)

Before: `... --path .agents/worktrees/<task-id>` → `gives you a pane + worktree`

After: `... --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"` → `gives you a pane + worktree (`--path` is absolute on purpose: `--cwd` fixes only where `--base` resolves, not where `--path` lands)`

### Edit 3 — `.agents/foreman/rules/extensions.md:41` ("Worktree lifecycle" step 1)

Before: `... --path .agents/worktrees/<task-id>` → `gives pane + worktree`

After: `... --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"` → `gives pane + worktree (`--path` is absolute on purpose: `--cwd` fixes only where `--base` resolves, not where `--path` lands)`

The note at each of sites 2 and 3 exists so neither reads as if `--cwd` covered
`--path` too.

Verification of the three sites after the edit:

```
$ grep -n "herdr worktree create" .agents/foreman/agent.md .agents/foreman/rules/extensions.md
.agents/foreman/agent.md:73:   `herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"`
.agents/foreman/agent.md:111:- `herdr worktree create/close/list` for worktrees
.agents/foreman/agent.md:120:1. `herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"` → gives you a pane + worktree (`--path` is absolute on purpose: `--cwd` fixes only where `--base` resolves, not where `--path` lands)
.agents/foreman/rules/extensions.md:41:1. `herdr worktree create --cwd "$(git rev-parse --show-toplevel)" --branch foreman/<task-id> --base origin/main --path "$(git rev-parse --show-toplevel)/.agents/worktrees/<task-id>"` → gives pane + worktree (`--path` is absolute on purpose: `--cwd` fixes only where `--base` resolves, not where `--path` lands)
```

(`agent.md:111` is the prose tool list, not a command site.)

### Edits 4-6 — `.agents/reviewer/agent.md` (the CI gate), made by the reviewer seat

These three were made by the **pr-reviewer seat itself**, not by a worker on
a brief, and they are recorded here so they are not lost with a bus message.
Untracked and unstaged, per the founder's decision — same state as every other
persona edit above.

**Edit 4 — the `gh pr checks` exit-code table.** Before: the persona said only
"pending is not failing" in prose, with no number. After, at
`.agents/reviewer/agent.md:197-206`:

| Exit | Meaning | Your move |
|---|---|---|
| `0` | every check passed | merge |
| `8` | checks are **pending** | wait — pending is not failing |
| `1` | a check **failed** | OBJECTION — do not merge |

plus: "Anything else is a non-zero exit that is not a failure verdict: **treat
it as unknown, not as a failure.** Never bounce a PR because the runner is
slow." The gap that closed was the last clause: an agent told "non-zero =
objection" would have bounced a PR whose runner was merely slow.

**Edit 5 — the bucket form.** After, at `.agents/reviewer/agent.md:213-218`:
`gh pr checks <pr-number> --json name,state,bucket`, with `bucket` one of
`pass`, `fail`, `pending`, `skipping`, `cancel`, and "merge only when no
bucket is `fail`; `pending` means wait." The gate then never has to reason
about exit codes.

**Edit 6 — `--delete-branch` must be explicit.** After, at
`.agents/reviewer/agent.md:220-227`: a repository can have
`delete_branch_on_merge` turned off, in which case the task branch survives the
merge and the next task's worktree can collide with it — so pass
`--delete-branch` every time, and check afterwards with
`git ls-remote --heads origin 'foreman/<task-id>'`, which must print nothing.

**Why `--required` stays out**, measured on 2026-10-22 and unchanged by these
edits: `gh api repos/khanshifaul/guzia-high-school/branches/main/protection`
-> `404 Branch not protected`, and on a passing PR `gh pr checks 12 --required`
exits **1** with "no required checks reported" — indistinguishable from a real
failure — while `gh pr checks 12` exits **0**. `gh pr checks --help` confirms
`8: Checks pending`, and `gh pr checks 12 --json name,state,bucket` returns
`"bucket":"pass"` on live checks.

**One correction to the reviewer's own write-up of these edits.** It recorded
the error as raised at
`apps/api/src/admissions/dto/review-application.dto.ts:10:8` and surfacing
through `ValidateBy:16`. The shape is right — the error surfaces in a filter,
not at a raise — but two specifics do not hold in this repo: **`ValidateBy`
does not exist anywhere in the tree** (`grep -rn "ValidateBy" --include="*.ts"
--include="*.js" . --exclude-dir=node_modules` -> no matches), and
`review-application.dto.ts:10` is `export class ReviewApplicationDto {` — a
class declaration, not a raise site. The decorators that raise are
`@IsEnum(AdmissionDecision)` (line 13) and `@Length(0, 500)` (line 18). The
chain that exists is: DTO decorator -> the global `ValidationPipe`
(`apps/api/src/main.ts:40-46`) -> **`ValidationExceptionFilter`**
(`apps/api/src/common/filters/validation-exception.filter.ts:11`, registered at
`main.ts:48`). Recorded because a wrong symbol in a rule is a pointer that
sends the next reader somewhere the thing is not.

## The tracking decision — recorded, not changed

The founder decided (2026-10-22) that **`.agents/` stays off this repo**. The
repo is public:

```
$ gh repo view khanshifaul/guzia-high-school --json visibility
{"visibility":"PUBLIC"}
```

The office layer carries the founder's working preferences and personal notes —
`memory/founder.md` and `memory/personality.md` are personal notes. `.gitignore`
therefore ignores
`.agents/AGENTS.md`, `.agents/foreman/`, `.agents/hr/`, `.agents/memory/`,
`.agents/prompts/`, `.agents/reviewer/`, `.agents/rules/`, `.agents/shared/`,
`.agents/worker/` and `.agents/zolly/`.

Accepted cost, knowingly:

- a fresh clone and every task worktree carry no rules, so an agent there
  re-derives them;
- the office only runs on the machine that holds `.agents/`;
- `.agents/results/` is deliberately NOT ignored, so a worker can commit its
  result file on the task branch and the reviewer can read it there. A squash
  merge brings that file onto `main` too, so a result file is **public once
  merged** and must carry no personal facts.

So "a task branch cannot carry a rule change" is deliberate, not a defect.
This task does not propose tracking `.agents/`, does not `git add -f` a persona
file, and does not edit `.gitignore`.

Current tracked state of `.agents/` (the routing's "1 file, probe-merge.md" is
stale; the probe file was removed by the revert PR #5, `cdf160e`):

```
$ git ls-files .agents
.agents/results/office-bootstrap.md
```

## The other three command fixes were already in place (not this task's work)

Verified before editing; not re-applied:

```
$ grep -n "git diff origin/main...HEAD" .agents/foreman/agent.md .agents/foreman/rules/extensions.md .agents/reviewer/agent.md
.agents/foreman/agent.md:172:Diff: run 'git diff origin/main...HEAD' in the worktree.
.agents/foreman/rules/extensions.md:64:Diff: run 'git diff origin/main...HEAD' in the worktree.
.agents/reviewer/agent.md:51:2. Read the worktree diff (`git diff origin/main...HEAD` in `.agents/worktrees/<task-id>/`)

$ grep -n "gh pr checks" .agents/reviewer/agent.md
79:gh pr checks <pr-number>
89:**Read the exit code, not the presence of output.** `gh pr checks` exits:
101:`gh pr checks <n> --required` then exits `1` with "no required checks
106:gh pr checks <pr-number> --json name,state,bucket
```

`--cwd` is present at all three `herdr worktree create` sites (see the grep in
the persona-edit section above). These came from task `office-bootstrap`,
merged as `5b77972`. Line 101's `--required` mention is explanatory prose in
the reviewer persona, not an invocation. The next agent should not re-apply
any of these three.
