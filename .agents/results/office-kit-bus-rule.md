---
id: office-kit-bus-rule
title: Name the three privacy surfaces in the kit, and fix the agent-name arithmetic
status: done
gate: auto
---

## Summary

Kit PR #4 screened one surface. It now names **three** — the tree,
`.agents/inbox/`, and the radio ledger — and gives a runnable check for each, so
the rule is executable rather than merely read. `radio show <id>` is ruled out
as a check because it consumes what it reads.

The same branch fixes the agent-name arithmetic: the old wording ("8 characters
plus the frequency") invited counting the template, so the rendered name was
miscalculated. It now states the cap, the prefix and the budget as three
numbers and says the count is of the **rendered** string.

The earlier result file `.agents/results/office-kit-load-line.md` carried that
miscounted example (38 for a 45-character name) and a mislabelled site count;
both are corrected on its own branch. The kit PR is **not merged** — the kit has
no reviewer seat.

Nothing written here or in the kit names the term. It is treated throughout as a
category — "a personal detail about the founder" — and I did not look it up.

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-kit-load-line`, commit
`9c94a895e8d6f664ace892c634893db0e89c8291`):

- `.agents/rules/result-contract.md` — new subsection **Three places a copy
  survives — and the three checks**: the surface table, the three runnable
  checks, the command-form clause, the shared-bus clause, the ledger-is-not-ours
  clause, and the category statement.
- `.agents/reviewer/agent.md` — step 4 now runs all three surfaces, names the
  ledger path, rules out `radio show`, and points at the contract for the rule
  instead of restating it.
- `.agents/foreman/agent.md`, `.agents/foreman/rules/extensions.md`,
  `.agents/zolly/rules/extensions.md` — the agent-name arithmetic, stated as
  cap / prefix / budget with the count taken on the rendered name.

Guzia-high-school:

- `.agents/results/office-kit-load-line.md` — corrected (branch
  `foreman/office-kit-load-line`, commit
  `4cde346da129f91abe016f33e8d17ab9b9252ec0`, which updates PR #10). **This is
  someone else's result file.** It is corrected because it is the file the next
  reader trusts: it said **38** for a name that is **45**, and **18** for a task
  id that is **20**, and an example that is wrong is worse than no example
  because the next agent copies the arithmetic.
- `.agents/results/office-kit-bus-rule.md` (this file).

## Verify

### Kit tests — `cd tool && cargo test`

```
test result: ok. 170 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.14s
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.04s
EXIT=0
```

`./test.sh` (syntax + python tests + MCP handshake): `Ran 62 tests in 7.630s`,
`OK`, `handshake ok`, `EXIT=0`.

### `grep -c` per surface in the kit — before (`6db2801`) → after (`9c94a89`)

| Pattern | `reviewer/agent.md` | `rules/result-contract.md` |
|---|---|---|
| `radio log` | 0 → 1 | 0 → 3 |
| `radio show` (the wrong command, named to rule it out) | 0 → 1 | 0 → 1 |
| `radio.db` (the ledger path) | 0 → 1 | 0 → 1 |
| `inbox` (the notes surface) | 0 → 2 | 0 → 2 |
| `founder-sensitive term` (the placeholder) | 0 → 0 | 0 → 3 |

The reviewer does not carry the placeholder because it does not restate the
rule: it names the three surfaces and the trap, and points at the contract for
the checks themselves.

### Fresh-install smoke (amended branch)

`install.sh <throwaway git repo> --no-binary --no-systemd --yes --founder Test`
→ `INSTALL OK`, and in the installed `.agents/`: `qc-loader-files=5`,
`model-cmd-sites=4`, `cwd-cmd-sites=3`, `short-id` mentions 8,
`name,state,bucket=1`, `required-command=0`, and the amended rule present
(`radio log` 1 site in the reviewer, 3 in the contract). The checked-in persona
is the source, so `install.sh` needed no edit.

### The three checks, in the kit's own wording

```bash
grep -ril "<the founder-sensitive term>" .agents/                  # the tree
grep -ril "<the founder-sensitive term>" .agents/inbox/            # the notes
radio log --limit 500 | grep -ci "<the founder-sensitive term>"   # the bus
```

**Why `radio log` and not `radio show <id>`.** `radio show` reads one message and
**consumes** it, so it cannot be a check — using it as an audit destroys what it
audits. `radio log` is read-only and prints message bodies to any seat. This is
stated in both files, because the wrong command is the one an agent reaches for
first.

> **Corrected after review, and the correction is stronger than the original
> reason.** The bus's own source says what `radio show` does: `cmd_show`'s
> docstring reads *"Print one message body (the exact envelope the pane
> received). Reading as the addressed recipient records the delivery — that is
> the pull path's acknowledgement"*, and the function ends with
> `UPDATE deliveries SET status='delivered', delivered_at=?`. So it is an
> **ack**, not a read, and the consequence is sharper than "consumes what it
> checks": an audit written against it **silently marks the inbox delivered**,
> so it destroys the inbox state it is auditing and the next reader sees those
> messages as already read. Both files now say that, from the source.

> **And a second correction: the bus check's gap is SCOPE, not truncation.**
> This record first said the log's undercount was body truncation in the
> rendering. It is not — `cmd_log` prints `row["text"]` in full, verbatim, one
> message per line, so no term is clipped out of a long line. What the
> undercount is: `cmd_log`'s docstring reads *"Inside a pane only this
> workspace's traffic; outside herdr the full ledger"*, and its query is
> `WHERE from_ws = ? OR to_ws = ?` with the current scope. **Inside a pane it
> selects only this office's traffic.** Measured 2026-10-22 on the shared
> ledger: the raw table held **58** messages carrying the term across two
> offices; the in-pane log showed **40**; the other office's **18** were not
> in scope and the log gave no indication of that. So the number means **"this
> many in this office"** — never "this many in the ledger", and never "the
> ledger is clean".

> **And a third, from the same review: prose needs its own rule, and it is the
> leak.** Re-classifying every occurrence in the raw table by context gives
> **76 in a command context and 46 in prose** — the prose spread across both
> offices and all three seats. So the rule now carries two different rules:
> a **command** containing the term is diligence-shaped but still names it
> (fix by habit — the argument is the placeholder), while **prose naming the
> condition** is disclosure, not diligence (fix by stating the decision and the
> paths, and saying nothing about what was behind them). The command form is
> the deceptive one, because the agent believes it did the careful thing; the
> prose form is the damaging one, because nothing about it looks like a
> mistake. **The prose form is also the one a tree-and-inbox audit misses**,
> because the bus was never in scope for anyone doing that audit — which is
> the general sentence this session kept arriving at: **a scan is only
> evidence about what it looked at.**

I did not run the three checks against this office: they require the term, and
looking it up is the disclosure this task exists to prevent. The rule text and
the install smoke are what I verified.

### Agent-name arithmetic — every length from the command shown

```console
$ python3 -c "print(len('guzia-high-school'))"
17
$ python3 -c "print(len('office-kit-load-line'))"
20
$ python3 -c "print(len('worker-guzia-high-school-'))"
25
$ python3 -c "print(len('worker-guzia-high-school-office-kit-load-line'))"
45
$ python3 -c "print(len('worker-guzia-high-school-okl'))"
28
$ python3 -c "print(len('worker-guzia-high-school-kitline'))"
32
$ python3 -c "print(len('pr-reviewer-guzia-high-school'))"
29
```

- cap `32`; prefix `worker-<frequency>-` = `7` + frequency + `1`;
  budget for `<short-id>` = `32` − prefix = `32 − 8 − len(frequency)`.
- at a 17-character frequency: prefix **25**, budget **7**.
- a 20-character task id renders to **45** (`25 + 20`) — rejected.
- short id `okl` renders to **28**, which fits; short id `kitline` renders to
  **32**, exactly the cap.
- `pr-reviewer-<frequency>`: prefix `12`, so a 17-character frequency renders to
  **29**, leaving 3 characters of room.

### Every other number in `.agents/results/office-kit-load-line.md`, re-run

| Claim | Re-measured | Verdict |
|---|---|---|
| `cargo test` 170 + 2, exit 0 | 170 passed, 2 passed, exit 0 | holds |
| `./test.sh` 62 tests OK | `Ran 62 tests … OK`, exit 0 | holds |
| fresh install: 5 loader files, `-- --model` 4, `--cwd` 3, `name,state,bucket` 1, 0 `--required` | 5, 4, 3, 1, 0 | holds |
| persona `queue-contract` table, 8 rows | all 8 match (`1/1`, `0/1`, `0/1`, `1/1`, `0/0`, `1/1`, `0/0`, `0/0`) | holds |
| worktree sites without `--cwd` | 3 → 0 | holds |
| `-- --model` command sites | 0 of 4 → 4 of 4 | holds |
| full-`<task-id>` worker names | 8 → 0 | holds |
| `gh pr checks --required` as a command | 1 → 0 | holds |
| `name,state,bucket` | 0 → 1 | holds |
| three-dot diff sites in the reviewer | 0 → 3 | holds |
| `<short-id>` "4 sites" | **4 is `foreman/agent.md` only**; across the three seat files it is **8** (4 + 3 + 1) | **corrected** |
| worked example 38 chars / task id 18 | **45 / 20** | **corrected** |

The first corrections were made in that file; the last two rows are the ones
that were wrong, and both were counted by placeholder rather than by rendered
string.

## Commit

- kit branch `foreman/office-kit-load-line`: `6db2801` (the PR #4 base commit)
  and `9c94a895e8d6f664ace892c634893db0e89c8291` (this amendment), PR
  https://github.com/khanshifaul/zolly/pull/4 — same PR, body updated, no second
  PR.
- guzia branch `foreman/office-kit-load-line`: `4cde346da129f91abe016f33e8d17ab9b9252ec0`
  corrects `.agents/results/office-kit-load-line.md`; it lands on PR #10.
- this result file: `512601ac1a4a81f6c154f1ca95c4fb8be4ee21e0`
  (`docs(office): record the three-surface privacy rule and the arithmetic fix`).
  The follow-up commit on the same branch records that SHA, because a commit
  cannot name its own.

## Blockers

- **Kit PR #4 is not merged, and this office cannot merge it.**
  https://github.com/khanshifaul/zolly/pull/4 is OPEN, 2 commits, MERGEABLE. The
  kit repo has no reviewer seat; its PR needs either the bare omp seat in
  `/home/khan/Projects/zolly` (pane `wH:p1`) or the founder. No merge was
  performed here, in either repo.
