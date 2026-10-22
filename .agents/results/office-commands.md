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

### Edit 7 — `.agents/reviewer/agent.md` (the diff/log pairing), made by the reviewer seat

Also made by the **pr-reviewer seat itself**, in its own persona, in the main
checkout. Untracked and unstaged, per the founder's decision.

The reviewer seat had the three-dot rule but not the **pairing**: which form
belongs to which command, and why the two-dot diff is the dangerous one. After,
at `.agents/reviewer/agent.md:53-73`:

```bash
git diff origin/main...HEAD            # the task's own change — use THIS
git log --oneline origin/main..HEAD    # the commits on the branch — two dots here
```

with "**Three dots for the diff, two for the log.** They are not
interchangeable", the measurement (three-dot `--name-only` gave `taskfile.txt`
— the task's only change; two-dot gave `mainfile.txt` AND `taskfile.txt`), the
consequence (a diff containing a **false change**, which can raise a bogus
OBJECTION against a file the worker never edited, or lose the real change in
the noise), and plain `git diff` named as worse still — empty on a committed
branch.

The clause added here that the office did not have anywhere: **"Run the `git
log` form as well. When the diff is empty — a worker that committed nothing,
or a branch that is already merged — the log is what shows what is actually
there."** The three-dot form alone leaves a reader with no way to tell "the
worker changed nothing" from "the diff is looking at the wrong thing".

**The same clause was applied to the foreman's two files**, which already
carried the pairing and the "false change" reason but not the log-as-companion
instruction: `.agents/foreman/agent.md:192-194` and
`.agents/foreman/rules/extensions.md:119-121`. All three seats now carry the
same three-part rule: the pairing, the false-change reason, and the log as
companion.

**One two-dot diff that is correct, and why it must not be "fixed".**
`.agents/foreman/rules/extensions.md:58` reads
`git diff origin/main origin/<branch> --stat   # empty = the content is merged`,
and it is the **opposite** rule: it uses the two-dot form deliberately, because
comparing the two tips is exactly the question "is this branch's content
already in main?". The same file says there that the log is **not** the test
there — a squash merge leaves the branch's commits out of main's ancestry, so
`git log origin/main..origin/<branch>` lists every commit the branch
contained (twelve of them) while the diff is empty. A rule that said "two dots
are never right" would have broken this one, which is why the rule is stated as
a pairing — *this* command takes three dots, *that* command takes two — and
not as a blanket prohibition.

### Edit 8 — `.agents/foreman/` (the foreman loads the result-file rule)

Made by the foreman seat, in its own files, in the main checkout. Untracked and
unstaged, per the founder's decision.

**The gap.** The foreman loaded `.agents/rules/queue-contract.md` — the brief
side of the privacy rule — and referred to `.agents/rules/result-contract.md`
only for the result file's **format**. The rule that a result file states the
**decision** and the **paths**, never the personal content behind them, lived
in a file the foreman never loaded. But the foreman is the seat that reads
that file before it goes to the reviewer, and a result file is **public once
merged** — a squash merge puts it on `main` whatever `.gitignore` says about
the task branch. That is the layer the leak came from: the brief was
authored one step earlier, and the rule that would have stopped it was in the
reviewer's file, not the brief-writer's.

**After — `.agents/foreman/agent.md:17-23`**, the rules-to-load block now
names the result file as a rule the foreman follows:

> **The result file the worker writes:** `.agents/rules/result-contract.md` —
> its format, and the rule that a result file states the **decision** and the
> **paths**, never the personal content behind them. You are the seat that
> reads that file before it goes to the reviewer, and a result file is
> **public once merged** … Both rules live in one place each: the reviewer
> points at the same file you do, and neither of you restates it.

**After — `.agents/foreman/rules/extensions.md:208-217`**, the Reporting
format section says to read what the result file SAYS, not just what it
changes, and that the fix for a leak is to have the worker state the decision
neutrally — **not** to delete the file, and not to edit it yourself.

**After — `.agents/foreman/rules/extensions.md:51-66`**, a **"Where the rules
live"** table: each rule has one authoritative file, and the reviewer points
at the same files the foreman does. The shape is the reviewer's own
`.agents/reviewer/rules/extensions.md` table, so the two seats are symmetric.

**No second copy of the rule.** The content rule stays in
`result-contract.md` → **What a result file must not contain**. Both seats
point at it; neither restates it. That is the same shape the reviewer seat
and the foreman seat converged on for the three-surface privacy check — one
place a reader looks, not two copies to drift.

### Edit 9 — `.agents/reviewer/agent.md` (read the file that ships, not the diff)

Made by the foreman seat, in its own persona, in the main checkout. Untracked
and unstaged, per the founder's decision.

**The gap.** These personas and rules are **copied into every office that
installs the kit** — `install.sh:480` is `cp -R "$TEMPLATE/." "$AGENTS_DIR/"` —
so a change here is a change to every future office, and a personal detail
written into one of these files is copied into every future checkout. The
persona did not say so, so a reviewer here was reviewing a *project* when the
artefact under review was a *template*.

**After — `.agents/reviewer/agent.md:18-34`**, the reviewer is told to read
the whole file before the diff, and to read it as a file that ships:

- **Re-read the file you are judging, in full, before the diff.** A persona
  or a rule edited in one place can contradict the same file edited in
  another, and the copy in front of you may not be the copy that shipped.
  Measured 2026-10-22: this office's reviewer persona carried
  `gh pr checks <pr-number> --required` — which on a base branch with no
  protection exits `1` on a **green** PR — while the rule file beside it
  already said when to OBJECT. Two files, two rules, one seat that loads
  both.
- **A rule written here travels further than a rule written in a project.** The
  category in a rule must be the widest one that still says what the rule
  needs to say, because every install copies it.

The same rule is in the kit's own reviewer persona (kit PR #4, `18f6f0a`), in
the kit's voice and against the kit's own `install.sh:480`.

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
