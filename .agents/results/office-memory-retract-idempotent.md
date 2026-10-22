---
id: office-memory-retract-idempotent
title: Make memory retract idempotent so it cannot grow the store
status: done
gate: auto
---

## Summary

`memory retract` wrote its `Promoted to:` line unconditionally, so retracting
an already-retracted entry appended a second line, grew the file by the length
of that line, and reported success. It now rewrites the target entry with
exactly one pointer, writes only when the bytes actually change, and says what
it did: a repeat with the same target is a byte-for-byte no-op ("already
retracted ... unchanged"), a different target replaces the recorded one and
names both, and a target-less re-retract leaves the recorded pointer alone.

The fix is a second commit on the existing kit branch, so the cause and the
remedy (`compact`) land in one reviewable diff. The kit PR is **not merged**.

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-memory-compact`, commit
`f874cdd71481e972ec6cc79cd8579051526525e4`, updates PR #5):

- `.agents/shared/memory` — `cmd_retract`: one-pointer rewrite, byte comparison
  before the atomic write, target replacement, honest messages.
- `tests/test_memory.py` — two tests: double retract (no growth, one pointer,
  honest message, and `compact` finding no duplicate) and a replaced target.

Guzia-high-school:

- `.agents/results/office-memory-retract-idempotent.md` (this file).

No change under `apps/`; the founder's `agents/critic/*.md` WIP was not edited,
staged, committed or discarded.

## Verify

### Memory CLI suite

```
$ cd /home/khan/Projects/zolly/.agents/worktrees/office-memory-retract-idempotent
$ python3 -m unittest tests.test_memory
.......................
----------------------------------------------------------------------
Ran 23 tests in 1.174s

OK
exit=0
```

21 tests before this change, 23 after (the two new ones). The nine `compact`
tests still pass.

### Kit suite

```
$ cd tool && cargo test
...
test result: ok. 170 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.16s
...
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.04s
exit=0
```

### Fixture — the minimal repro, retracted twice

`MEMORY_DIR=<tmp>` fixture, 145 B before (the same entry shape the brief
measured; the old code appended a 34-byte second line to it):

```
before: 145B, 1 pointer
$ memory retract L-0001 --promoted-to .agents/rules/two.md
memory: L-0001 already retracted in learnings.md — promotion target replaced: .agents/rules/one.md -> .agents/rules/two.md
after:  145B, 1 pointer

$ memory retract L-0001 --promoted-to .agents/rules/two.md
memory: L-0001 already retracted in learnings.md — promoted to .agents/rules/two.md (unchanged)
after:  145B, 1 pointer

$ memory retract L-0001                 # no target: the recorded pointer is kept
memory: L-0001 already retracted in learnings.md — promoted to .agents/rules/two.md (unchanged)
after:  145B, 1 pointer
```

The file after all three calls:

```markdown
# L

## L-0001 | 2026-10-22 | retracted | main
Promoted to: .agents/rules/two.md

This body is still here and is the only copy of the knowledge.
```

The body is still there (`retract` is not `compact`), the target is the newest
one, and no second line exists.

### Fixture — a first retraction still behaves as before

```
$ memory add learning "Fixture body is the only copy of the knowledge."
memory: wrote L-0001 to learnings.md
$ memory retract L-0001 --promoted-to .agents/rules/one.md
memory: L-0001 retracted from learnings.md — promoted to .agents/rules/one.md
after: 744B (preamble included), 1 pointer
```

### Real store, on a copy — `compact` still cleans the surplus

Source: `.agents/memory/learnings.md` copied to a temp `MEMORY_DIR`; the live
file was not edited. Its checksum was unchanged before and after: `yes`.

```
copy before: 22135B, entries with 2+ 'Promoted to:' lines: 7
$ memory compact
memory: compacted 26 retracted entries — reclaimed 18562B
memory: kept 27 entries — believed bodies and every header/pointer are intact (live 3573B / 24576B budget)
memory: removed 2 duplicate 'Promoted to:' line(s) — one pointer per retracted entry
memory: conflicting promotion targets — kept the most recent retraction's target:
        L-0013: kept Promoted to: /home/khan/Projects/zolly/.agents/zolly/rules/extensions.md; discarded .agents/memory/learnings.md
        L-0014: kept Promoted to: .agents/memory/learnings.md; discarded /home/khan/Projects/zolly/tool/src/main.rs
        L-0019: kept Promoted to: /home/khan/Projects/zolly/tool/src/main.rs; discarded .agents/zolly/rules/extensions.md
        L-0026: kept Promoted to: /home/khan/Projects/zolly/.agents/shared/memory; discarded .agents/memory/learnings.md
        L-0027: kept Promoted to: .agents/memory/learnings.md; discarded /home/khan/Projects/zolly/tool/src/tg/handlers.rs
copy after:  3573B, entries with 2+ 'Promoted to:' lines: 0
```

The seven surplus entries (`L-0006`, `L-0013`, `L-0014`, `L-0019`, `L-0026`,
`L-0027`, `L-0030`) reduce to one pointer each: two were exact duplicates and
five named two different targets. `retract` no longer creates that state.

## Policy — what a re-retraction does

**Replace, and say so.** The new `--promoted-to` target wins; the recorded line
is replaced, and the message names both the discarded and the kept target.

Why replace rather than keep-first:

- `retract` is the only supported way to record a corrected target. Keeping the
  first would strand a wrong target with no way to fix it except editing the
  store by hand, which the rules forbid.
- The store is committed, so the replaced target survives in git history if
  anyone needs it.
- It matches what `compact` assumes. `compact` keeps the FIRST `Promoted to:`
  line because that is the newest retraction, and `retract` writes its line
  immediately after the header. With replace, "first" and "newest" never
  diverge.

A replacement target longer than the recorded one adds exactly the string
delta — never a duplicated line — and the pointer count stays 1. A repeat with
the same target is byte-identical and does not rewrite the file at all.

## How `retract` and `compact` agree

The invariant both enforce: **one `Promoted to:` line per retracted entry.**

- `retract` writes exactly one line. It removes surplus pointer lines only in
  the target entry's header region, never in body text.
- `compact` removes duplicate lines (`removed N duplicate ...`) and, for two
  different targets, keeps the first (most recent) and prints the discarded
  one. It still cleans stores that already carry the surplus.
- `retract` therefore never creates state that `compact` has to dedupe. The
  new test runs `compact` after a double retract and asserts it reports no
  duplicate.
- The legacy surplus (the seven entries) is left to `compact`, which is the
  command built to reclaim it. `retract` also collapses surplus if it is called
  for that entry with a new target, and reports what it discarded.

## Commit

- Kit: branch `foreman/office-memory-compact`, commit
  `f874cdd71481e972ec6cc79cd8579051526525e4` (`memory: make retract
  idempotent`), PR <https://github.com/khanshifaul/zolly/pull/5> — updated,
  not a second PR.
- Guzia: this file — commit `C2F76D5_PLACEHOLDER` (recorded by the follow-up
  commit that fills this line, because a commit cannot name its own sha).

## Blockers

None technical.

- The kit PR #5 is **not merged**. The kit has no reviewer seat; it needs the
  bare omp seat in pane `wH:p1` (cwd `/home/khan/Projects/zolly`) or the
  founder to review and merge it. This worker merged neither repo.
- The guzia branch carries this result file only and is unmerged.
- The office's live store still holds the seven surplus entries because the
  kit CLI containing `compact` is unmerged, so the office cannot run it. The
  live store was not hand-edited; every run above used a copy.
