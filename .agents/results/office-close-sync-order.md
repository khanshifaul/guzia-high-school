---
id: office-close-sync-order
title: zolly close refuses on a tree that its own merge would clean
status: done
gate: auto
---

## Summary

`zolly close` applied its dirty-tree guard before `sync_main`, so it refused the
one tree it was about to clean: the task that lands its own dirty docs leaves
those files in the worktree holding exactly the content the incoming merge
brings. The sweep now filters the dirty list by content — a path stops being a blocker
only when it is staged (not untracked), its index agrees with HEAD or with the
incoming blob, and its worktree bytes equal the blob at `origin/<base>`. Every other case still refuses, by name. The change is
in the kit repo, not this one: the guard lives in the `zolly` binary.

## Files changed

- `tool/src/main.rs` (kit repo `khanshifaul/zolly`, branch
  `fix/close-sync-before-guard`, commit `7ca5790`)

## Verify

Repro — a scratch office, local `main` one commit behind `origin/main`, with
`HANDOFF.md` and `tomorrow_schedule.md` dirty at exactly the incoming content:

```
$ git status --short
 M HANDOFF.md
 M tomorrow_schedule.md
$ zolly close repro-task          # before the fix, installed binary
Error: refusing to touch main: it has uncommitted tracked changes — HANDOFF.md, tomorrow_schedule.md
exit=1
$ ./target/release/zolly close repro-task    # after the fix
1/6 sync      : fast-forwarded main 1eb34585 → b93b4aa4 (was 1 behind, 0 ahead)
2/6 branch    : no local branch foreman/repro-task
3/6 worktree  : no worktree .../.agents/worktrees/repro-task — skipped
6/6 summary   : sync ok b93b4aa4 | branch absent | worktree skipped (none) | done-signal MISSING (not in git) | deploy skipped (no tool change)
exit=0
$ git status --short
(empty)
```

The guard still refuses a genuinely dirty tree — one file differing, a stray
untracked file, and a staged version the merge would drop:

```
$ ./target/release/zolly close t
Error: refusing to touch main: it has uncommitted tracked changes — tomorrow_schedule.md
exit=1
  tree untouched:  M HANDOFF.md  M tomorrow_schedule.md

$ ./target/release/zolly close t
Error: refusing to touch main: it has uncommitted tracked changes — stray.stamp
exit=1
```

Two staged cases came from review and are both pinned now.

**First OBJECTION — a third staged version was dropped.** `MM HANDOFF.md` —
staged `B`, worktree `C` == incoming `C` — was treated as safe by a
worktree-only comparison; `merge --ff-only --autostash` then replayed the
worktree, exited 0, and `B` was gone with an empty stash list:

```
$ git status --short
MM HANDOFF.md
$ ./target/release/zolly close t
Error: refusing to touch main: it has uncommitted tracked changes — HANDOFF.md
exit=1
$ git diff --cached --stat
 HANDOFF.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ cat HANDOFF.md
incoming C
```

**Second OBJECTION — the criterion's other half was still refused.** Status
`M ` with index == worktree == incoming is a local change byte-identical to the
incoming blob, so criterion 1 requires it to pass. The index check now accepts
either end, not only HEAD:

Tests, run in `/home/khan/Projects/zolly/tool`:

```
$ cargo test
running 203 tests
test result: ok. 203 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.13s
running 3 tests
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s
running 1 test
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.08s
running 2 tests
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
running 1 test
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.05s
```

```
$ ./target/release/zolly close t          # status "M  HANDOFF.md" + " M tomorrow_schedule.md"
1/6 sync      : fast-forwarded main cd7a8871 → 756251dc (was 1 behind, 0 ahead)
6/6 summary   : sync ok 756251dc | branch absent | worktree skipped (none) | done-signal MISSING (not in git) | deploy skipped (no tool change)
exit=0
$ git status --short
(empty)
```

**Third OBJECTION — a staged-new path was collapsed with untracked.** Status
`A ` at the incoming blob was refused because the "tracked in the base" test is
false for a file the local base does not have, while `??` must stay refused. The
discriminator is index membership — `git cat-file -e :path` is yes for staged and
no for untracked (measured):

```
$ git cat-file -e :new.md && echo yes   # status "A  new.md"
yes
$ git cat-file -e :stray.md && echo yes # status "?? stray.md"
$ ./target/release/zolly close t        # staged-new at the incoming blob
1/6 sync      : fast-forwarded main 2ddb9d2d → e885ac4e (was 1 behind, 0 ahead)
exit=0
$ git status --short
(empty)

$ ./target/release/zolly close t        # untracked, same bytes as incoming
Error: refusing to touch main: it has uncommitted tracked changes — added.md
exit=1

$ ./target/release/zolly close t        # staged-new at a different blob
Error: refusing to touch main: it has uncommitted tracked changes — added.md
exit=1
```

New tests: `sweep_allows_dirty_files_that_already_hold_the_incoming_blob`,
`sweep_allows_a_staged_path_that_already_holds_the_incoming_blob`,
`sweep_allows_a_staged_new_path_that_already_holds_the_incoming_blob`,
`sweep_still_refuses_a_genuinely_different_file`,
`sweep_refuses_a_staged_version_the_merge_would_drop`,
`sweep_never_treats_an_untracked_path_as_safe`.

The kit's own gate, run from `/home/khan/Projects/zolly`:

```
$ ./test.sh
Ran 85 tests in 14.598s
OK
== mcp handshake
handshake ok
```

`git diff --quiet <ref> -- <path>` was considered and rejected for the content
test: it exits 0 for an untracked path that does not exist in `<ref>`, which
would have let a stray file through. Measured:

```
$ printf 'stray\n' > stray.md; git diff --quiet origin/main -- stray.md; echo $?
0
```

## Commit

`7ca5790` — kit repo `khanshifaul/zolly`, branch `fix/close-sync-before-guard`.
PR: https://github.com/khanshifaul/zolly/pull/26

This repo's change is the queue entry (`status: dispatched` until that PR merges)
and this result file.

## Blockers

The kit repo has no office, so no reviewer seat can merge PR #26 — the door is
the founder (`.agents/rules/workflows.md`, and the 2026-10-23 handoff records the
same for kit PRs #13 and #14). The queue entry stays `dispatched` until that
merge; `done` requires the merge, not the commit.

## Reflection

Three review rounds, all on one axis: the predicate asked "is this path safe?"
and answered with a proxy — a status letter, a ref membership — instead of the
three facts that actually decide it (staged, index at one of the two ends,
worktree at the incoming blob). The first proxy dropped a staged version, the
second refused the criterion's other half, the third collapsed `A ` with `??`.
Recorded in the predicate's comment and pinned by six tests, one per shape, so
the next widening has something to fail against.
