---
id: office-memory-compact
title: Add a memory compact that reclaims bytes from retracted entries
status: done
gate: auto
---

## Summary

The kit's memory CLI can now reclaim the bytes held by retracted entries:
`memory compact [<id>...]` drops a retracted entry's body, keeps its header
(id, date, status) and exactly one `Promoted to:` pointer, and prints the bytes
reclaimed. Believed/confirmed entries, the preamble and `archive/` are
untouched. A retracted entry with no pointer is left in place and reported for
a human.

It is idempotent, uses the existing `tmp -> sync -> mv` atomic write, never
grows a file, and does not change the entry count, so it neither triggers nor
replaces the archive roll. It is safe on an over-budget store — the state a
double retraction creates.

The kit change is on a separate branch and PR from the open persona PR #4:
`foreman/office-memory-compact` in `khanshifaul/zolly`, PR #5. **That PR is not
merged.**

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-memory-compact`, commit
`19d9fa5`, PR #5 — separate from open PR #4):

- `.agents/shared/memory` — new `compact` verb; dispatch, usage/help, the add
  refusal advice, and the over-budget advice in `check`.
- `tests/test_memory.py` — 8 tests: body dropped/header kept, believed block
  byte-identical, no-target left in place, idempotence, over-budget recovery,
  duplicate tombstone, conflicting targets, named ids, unknown id.
- `.agents/memory/README.md` — usage line and the compact contract.
- `README.md` — test table row.

Guzia-high-school:

- `.agents/results/office-memory-compact.md` (this file).

No change under `apps/`, no change to the founder's `agents/critic/*.md` WIP.

## Verify

### Fixture — believed, retracted with pointer, retracted without pointer, over-budget

Fixture file `/tmp/mc/learnings.md`, **617 B before**:

```markdown
# Learned knowledge

Preamble line one.
Preamble line two.

## L-0001 | 2026-01-01 | believed | main

BELIEVED BODY kept exactly.

## L-0002 | 2026-01-02 | retracted | main
Promoted to: .agents/rules/workflows.md

RETRACTED BODY should be dropped.

## L-0003 | 2026-01-03 | retracted | main

NO TARGET BODY must stay.

## L-0004 | 2026-01-04 | retracted | main
Promoted to: .agents/rules/result-contract.md
Promoted to: .agents/rules/result-contract.md

DOUBLE TOMBSTONE BODY dropped.

## L-0005 | 2026-01-05 | retracted | main
Promoted to: .agents/rules/z.md
Promoted to: .agents/rules/a.md

CONFLICT BODY dropped.
```

`MEMORY_DIR=/tmp/mc .agents/shared/memory compact`:

```
memory: compacted 3 retracted entries — reclaimed 169B
memory: kept 5 entries — believed bodies and every header/pointer are intact (live 448B / 24576B budget)
memory: removed 1 duplicate 'Promoted to:' line(s) — one pointer per retracted entry
memory: conflicting promotion targets — kept the most recent retraction's target:
        L-0005: kept Promoted to: .agents/rules/z.md; discarded .agents/rules/a.md
memory: LEFT IN PLACE — L-0003 is retracted but has no 'Promoted to:' line.
        Its knowledge has no recorded home; a human must name one.
        Add the pointer with: memory retract L-0003 --promoted-to <file>
exit=1
```

**448 B after** (`617 -> 448`, reclaimed `169 B`):

```markdown
# Learned knowledge

Preamble line one.
Preamble line two.

## L-0001 | 2026-01-01 | believed | main

BELIEVED BODY kept exactly.

## L-0002 | 2026-01-02 | retracted | main
Promoted to: .agents/rules/workflows.md

## L-0003 | 2026-01-03 | retracted | main

NO TARGET BODY must stay.

## L-0004 | 2026-01-04 | retracted | main
Promoted to: .agents/rules/result-contract.md

## L-0005 | 2026-01-05 | retracted | main
Promoted to: .agents/rules/z.md
```

- Preamble + the `L-0001` believed block compare byte-for-byte identical before
  and after (`diff` on the segment: no output).
- `L-0003` is left in place because its knowledge has no recorded home; the
  command reports it and exits 1.
- `L-0004`'s second identical tombstone is gone; `L-0005` keeps the first
  (most recent) of two different targets and names the discarded one.

Second run on the already-compacted file:

```
memory: compact: nothing to compact — no retracted body left to reclaim (live 448B / 24576B budget)
memory: LEFT IN PLACE — L-0003 is retracted but has no 'Promoted to:' line.
...
exit=1
```

`cmp` between the file after run 1 and after run 2: identical.

### Over-budget store — compact is the non-destructive way out

Fixture `/tmp/mc2/learnings.md`: one believed + two retracted entries, 9000-byte
bodies, 3 entries against the bound of 30.

```
before: 27211B
$ memory check            -> BOUND EXCEEDED ... (exit 3)
$ memory compact          -> compacted 2 retracted entries — reclaimed 18004B
                             kept 3 entries ... (live 9207B / 24576B budget)   exit 0
after:  9207B
$ memory check            -> live size 9207B / 24576B budget — OK (exit 0)
```

No `archive/` directory was created: compaction is not a roll, and all three
ids remain live.

### Real store, on a copy — the defect the task measured

The source was `.agents/memory/learnings.md` in the guzia office, copied to
`/tmp/realstore/` first so the real file was never hand-edited. This is the
store that refused the lesson; the copy is what was compacted.

```
before: 22135B, 27 entry headers, 33 'Promoted to:' lines
$ memory check    -> live size 22135B / 24576B budget — OK
$ memory compact  -> compacted 26 retracted entries — reclaimed 18562B
                     kept 27 entries — believed bodies and every header/pointer are intact
                     (live 3573B / 24576B budget)                            exit 0
after:  3573B, 27 entry headers, 26 'Promoted to:' lines
$ memory check    -> live size 3573B / 24576B budget — OK
$ memory compact  -> nothing to compact                                     exit 0
```

Two entries carried a duplicate line and five carried a second **different**
target; each was reduced to one pointer and every discarded target was printed
(the first line is the latest retraction). The 33 pointer lines became 26 — one
per retracted id — so every citation still resolves.

Then the motivating failure was re-run against the compacted copy with a
628-byte lesson (the brief's refused lesson was 167–700 B):

```
$ memory add learning "Foreman: a measurement AGES. ..."  # 628 B
memory: wrote L-0033 to learnings.md
$ memory check -> live size 4270B / 24576B budget — OK
```

A write that was refused before compaction now fits with ~20 KB of headroom.

### Named ids and unknown ids

```
$ memory compact L-0002    # two retracted entries, one named
memory: compacted 1 retracted entry — reclaimed 10B
kept 2 entries ...         # L-0001's body is still present; L-0002's is gone
exit=0

$ memory compact L-9999
memory: no entry L-9999 (ids look like D-0001, L-0001, C-0001)
exit=1                     # file byte-identical; fail-closed before any write
```

### Kit tests

```
$ ./test.sh
...
Ran 70 tests in 10.165s
OK
== mcp handshake
handshake ok
test_sh_exit=0
```

```
$ cd tool && cargo test
test result: ok. 170 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.14s
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.04s
cargo_exit=0
```

## Commit

- Guzia result file:
  `c2f76d57052c0d88d96e07644d8e85e8b00ca306`
  (`docs(office): record the memory compact result and its design answers`).
  The follow-up commit on the same branch records that SHA, because a commit
  cannot name its own.
- Kit: branch `foreman/office-memory-compact`, commit
  `19d9fa52f25882145e67f3bc91e26c2f8e45baab` (short `19d9fa5`), PR
  <https://github.com/khanshifaul/zolly/pull/5>.

## Blockers

None technical. The kit PR is **not merged**: the kit has no reviewer seat, so
it needs the bare omp seat in pane `wH:p1` (cwd `/home/khan/Projects/zolly`) or
the founder to review and merge it. This worker merged neither repo. The guzia
PR is a result file only and is also unmerged.

## Design questions

### Does compaction count as an entry-count change for the archive roll?

No. Every header survives, and `count_entries` counts headers, so the count is
identical. The roll exists to bound the live window by **identity**; compact
removes no identity, only bytes. It must not trigger the roll — moving a
still-cited entry to `archive/` as a side effect of a byte reclaim would be a
loss nobody asked for — and it must not substitute for it: the count bound
stays enforced by `enforce_bound`. Compaction and the roll act on orthogonal
axes (bytes vs entries), so compact changes neither `n` nor the roll decision.

### Automatic before a write fails, or only on request?

On request only. Three reasons:

1. Compaction discards prose that `retract` deliberately keeps. That is a
   content/history decision, not a precondition of writing a different entry.
   Automating it would make an old body vanish at the moment an unrelated write
   happens.
2. A refusal can have a cause compaction cannot fix — a single entry larger
   than the whole budget, or a still-live entry holding the bytes. Auto-compact
   would then run, fail to make room, and still have destroyed history.
3. Predictability: the result of an `add` should depend on the text being
   added and the current bytes, not on a hidden reclamation step that changes
   what is on disk.

The real failure mode — a write refused for a reason unrelated to what was
written — is addressed without automation: the refusal now names
`memory compact`, and `check` names it before advising a roll. The agent gets a
discoverable, explicit lever. If it is ever automated, it should be an opt-in
flag, not implicit.

### What happens to the `archive/` files?

They are not compacted. `live_bytes` does not count them, so compacting them
frees no budget. They are the durable, full-prose history and the only copy of
a body after a live compaction; `search` reads them. Truncating them would turn
a byte reclaim into data loss, contrary to `retract`'s "nothing is ever
deleted" model. If an archived retracted entry ever needs a body dropped, that
is a separate explicit operation with a different justification (historical
retention, not live budget), and this verb deliberately does not do it.

### Two `Promoted to:` lines pointing at different files?

Keep the **first** and report the discarded one.

`retract` inserts its new pointer immediately after the header, so file order is
reverse chronological: the first line is the **latest** retraction, not the
oldest. The store's own model is that a later correction supersedes an earlier
one, so a second retraction with a different target is a correction of where
the knowledge went; keeping the last line would preserve the stale claim.

Keeping both would violate the one-pointer rule and cost exactly the bytes
compact exists to reclaim (a pointer line is tens of bytes, and the current
store had 33 lines for 26 entries). The discarded target is printed, so the
conflict is visible and a human can repair the rule file if the later target
was wrong. Because the body is dropped, the old pointer survives nowhere in the
live file — but the command reports it at the moment of compaction rather than
silently choosing.
