---
id: office-kit-load-line
title: Bring the load line, the reviewer rules and the command fixes back into the office kit
status: done
gate: auto
---

## Summary

The kit (`khanshifaul/zolly`) now carries the three halves this office had
fixed in its own checkout: the brief contract is loaded by the foreman's own
rules file and named by its boot prompt; `reviewer/agent.md` has the four
reviewer-side rules (content screen, `gh pr checks` exit-code table, the
`--json bucket` form, three dots for the diff); and the dispatch commands in
`foreman/agent.md`, `foreman/rules/extensions.md` and `zolly/rules/extensions.md`
carry `--cwd`, an absolute `--path`, `-- --model`, and the
`worker-<frequency>-<short-id>` agent name with its 32-character cap stated.

PR #3 (`8d5e84e`) had already landed the result-contract privacy section and
most of the load line; this does not re-add either. The reviewer rule points at
`result-contract.md` → "What a result file must not contain" instead of copying
it.

The kit PR is **not merged**: merge authority for the kit repo is the kit's, and
this office's reviewer does not merge there.

## Files changed

- `.agents/results/office-kit-load-line.md` (this file, guzia-high-school)

Kit-side changes are on a separate branch and PR in `khanshifaul/zolly`:

- `.agents/foreman/agent.md` — seat names (`<short-id>` + the 32-char cap),
  worktree `--cwd` + absolute `--path` with the reason for both, `-- --model` on
  the worker and reviewer starts, the review request now asks for a three-dot
  diff.
- `.agents/foreman/rules/extensions.md` — the `queue-contract.md` load line,
  the seat row and cap rule, and the same three command fixes.
- `.agents/foreman/boot/foreman.md` — names `queue-contract.md` as part of the
  persona's list and says the boot prompt carries no rules list of its own.
- `.agents/zolly/rules/extensions.md` — seat row `worker-<frequency>-<short-id>`
  plus the cap rule, stating which of the two names is abbreviated.
- `.agents/reviewer/agent.md` — content screen (step 4, pointing at
  `result-contract.md`), three-dot diff rule (step 2), exit-code table and
  bucket form, `--required` removed, two new review criteria.
- `.agents/worker/generic.md` — a Guardrails bullet for the one case the worker
  is asked to carry out: a brief that tells it to write a personal fact.

## Verify

### Kit tests — `cd tool && cargo test`

```
test result: ok. 170 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
EXIT=0
```

`./test.sh` (syntax + 62 python tests + MCP handshake): `Ran 62 tests … OK`,
`handshake ok`, `EXIT=0`.

### Fresh-install smoke — the mechanism the task is about

`install.sh <throwaway git repo> --no-binary --no-systemd --yes --founder Test`
→ `INSTALL OK`, and in the installed `.agents/`: `queue-contract` = 1 in each of
the five files that name it (`foreman/agent.md`, `foreman/rules/extensions.md`,
`foreman/boot/foreman.md`, `zolly/agent.md`, `reviewer/rules/extensions.md`);
`-- --model` 4 command sites (3 in `foreman/agent.md`, 1 in
`foreman/rules/extensions.md`); `--cwd "$(git
rev-parse --show-toplevel)"` 3 command sites; `<short-id>` 4 sites;
`name,state,bucket` 1; zero `gh pr checks <n> --required` commands. So the
checked-in persona is what a fresh install gets — `install.sh` needed no edit for
this.

### `grep -c queue-contract` per persona — kit `origin/main` (`8d5e84e`) → branch

| Persona file | before | after | PR #3 or this branch |
|---|---|---|---|
| `.agents/foreman/agent.md` | 1 | 1 | PR #3 |
| `.agents/foreman/rules/extensions.md` | 0 | 1 | this branch |
| `.agents/foreman/boot/foreman.md` | 0 | 1 | this branch |
| `.agents/zolly/agent.md` | 1 | 1 | PR #3 |
| `.agents/zolly/rules/extensions.md` | 0 | 0 | not needed — see below |
| `.agents/reviewer/rules/extensions.md` | 1 | 1 | PR #3 |
| `.agents/reviewer/agent.md` | 0 | 0 | decided against — see below |
| `.agents/worker/generic.md` | 0 | 0 | decided against — see below |

### Command-fix sites — kit `origin/main` → branch

| Defect | before | after |
|---|---|---|
| `herdr worktree create --branch …` without `--cwd` | 3 (2 `foreman/agent.md`, 1 `foreman/rules/extensions.md`) | 0 |
| `herdr agent start … --kind omp` without `-- --model` | 0 of 4 command sites | 4 of 4 |
| worker herdr name `worker-{{FREQUENCY}}-<task-id>` | 8 (4 + 3 + 1) | 0 |
| `gh pr checks <pr-number> --required` as a command | 1 | 0 (`--required` now appears only as a prohibition) |
| `gh pr checks --json name,state,bucket` | 0 | 1 |
| three-dot diff (`…HEAD`) in the reviewer | 0 | 3 |

**Where my numbers differ from the brief's.** The brief measured 0 sites with
`--cwd`; measured, the kit had **1** occurrence in `foreman/agent.md`, but it was
on `herdr tab create`, not `herdr worktree create` — the three real worktree
sites had none. The brief measured 5 full-`<task-id>` agent-name sites; measured,
there were **8** across the three files that name seats. The reviewer rows
(0/0/0/0) and the `result-contract` row (1) matched.

### Reviewer rules, after this branch

- Content screen: present as step 4 of **What you do**, and as a criterion;
  points at `.agents/rules/result-contract.md` → **What a result file must not
  contain** (no second copy of that section).
- Exit-code table: `0` pass / `8` pending / `1` fail, anything else unknown.
- Bucket form: `gh pr checks <n> --json name,state,bucket`, merge only when no
  bucket is `fail`.
- Three dots for the diff, two for the log, with the false-change failure mode.

## Load-line decisions, per persona

- **foreman — added in `rules/extensions.md`.** That file is loaded *instead of*
  the generic rules and it is the file the dispatch commands live in, so it was
  the one place the brief's contract could be missing while the persona still
  read the brief rule from `agent.md`. Loaded with a seat-specific reason.
- **foreman boot prompt — added, as a pointer.** It names `queue-contract.md` as
  part of the persona's list and states that the prompt itself carries no rules
  list. A boot prompt with its own list is a second list to drift; without even
  the name, a seat that acts before reading the persona acts without the rule.
- **zolly — already landed by PR #3** (`zolly/agent.md`). Its
  `rules/extensions.md` was not given a line: it is the operational playbook
  (delegation, pulse, seat names), not a rules manifest, and the persona already
  names the contract.
- **reviewer — NOT added.** The reviewer's `rules/extensions.md` already has the
  "Where the rules live" row for `queue-contract.md` ("the queue status you
  close — `done` needs the merge"). That is the reviewer's reason to read it,
  and it is already loaded. A second line in `reviewer/agent.md` would be two
  copies in one seat. The reviewer's privacy duty is `result-contract.md`'s,
  which it loads, and this branch gave it the content screen that enforces it.
- **worker — NOT added; a Guardrail added instead.** The worker already loads
  `result-contract.md`, which carries the brief rule one layer up (§"The same
  rule, one layer up: the brief") and is the contract it writes against. What
  the worker lacked was not knowledge of the rule but the *action* — so
  `worker/generic.md` now says that a brief which tells it to record a personal
  fact is a bad brief: say so on the bus, write the decision and paths, and
  point at the contract.
- **`install.sh` — unchanged, on purpose.** `install.sh:480` copies the
  checked-in `.agents/` template verbatim, so the persona edit is the fix. The
  root-context `@`-token list (`install.sh:624`) is **not** given the brief
  contract: it is the harness's session context, it holds the four universal
  rulebooks plus the goal, and the installer never edits an existing root file —
  it only warns about missing tokens. A token added to the emitted template
  would therefore leave every existing install without it, while a seat's rules
  list is what makes a seat read a file. Adding it there would also make
  `result-contract.md`'s absence inconsistent, since the two contracts are the
  same kind of artifact.

Where a rule is right for one machine and wrong for another, only the
machine-specific part is marked: **`<model>`** in the `-- --model` commands is
a per-machine placeholder with the mechanism and failure stated (the default
model may not be in the account's plan → `403 MODEL_NOT_IN_PLAN` on the first
turn while the dispatch looks healthy). Everything else — `--cwd`, absolute
`--path`, the short id, the exit-code table — is machine-independent.

## The agent-name convention the kit now states

- herdr caps an **agent name** at **32 characters** and rejects a longer one
  with `invalid_agent_name`.
- `worker-<frequency>-` is 8 characters plus the frequency. A 17-character
  frequency leaves **7** for the short id, so the form is
  **`worker-<frequency>-<short-id>`** with the short id **at most 7
  characters**; a shorter frequency leaves room, but 7 is the rule that holds at
  every frequency.
- **Only the herdr agent name is abbreviated.** The radio handle
  (`worker-<task-id>`), queue path (`.agents/queue/<task-id>.md`), branch
  (`foreman/<task-id>`), result file (`.agents/results/<task-id>.md`) and
  worktree path (`.agents/worktrees/<task-id>/`) keep the full task id.
- `pr-reviewer-<frequency>` is 12 + the frequency, so it fits a 17-character
  frequency at 29; it must not grow a suffix.

Worked example: frequency `guzia-high-school` (17) with task id
`office-kit-load-line` (18) would give
`worker-guzia-high-school-office-kit-load-line` — **38** characters, rejected.
Short id `kitline` gives `worker-guzia-high-school-kitline` — **32**, exactly
the cap.

## Commit

- result file: `c391254785af80c63b6d6267ed92b2f613012369`
  (`docs(office): record the kit load-line, reviewer rules and command fixes`).
  The follow-up commit on `foreman/office-kit-load-line` records that SHA,
  because a commit cannot name its own.
- kit branch `foreman/office-kit-load-line`, commit
  `6db280174cbed2b177f13bbe68bca4b96d8d5360` (parent `8d5e84e`), PR
  https://github.com/khanshifaul/zolly/pull/4

## Blockers

- **The kit PR is not merged, and this office cannot merge it.**
  `https://github.com/khanshifaul/zolly/pull/4` is OPEN and MERGEABLE. The kit
  repo has no reviewer seat; its PR needs either the bare omp seat in
  `/home/khan/Projects/zolly` (pane `wH:p1`) or the founder. No merge was
  performed here, in either repo.
