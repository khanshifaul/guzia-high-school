---
id: office-kit-installer-excludes
title: Stop the installer shipping local build artefacts, and make the test claim true
status: done
gate: auto
---

## Summary

`install.sh`'s copy path used `cp -R "$TEMPLATE/." "$AGENTS_DIR/"`, which has
no exclusion, while the backup path already excluded worktrees, runs and the
tool's `target/`. Running the installer from a clone therefore shipped every
open worktree and its build output into the target: 52M on the measured
reproduction. The copy now uses the same tar pipe as the backup and both read
one `TAR_EXCLUDES` value, so the two paths cannot drift again. The kit's
`.gitignore` now lists `.agents/worktrees/`, matching its own runtime-dir list.

The published path is untouched: it fetches a git archive, and
`.agents/worktrees/` is untracked, so an archive never carried it.

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-kit-installer-excludes`):

- `install.sh` — one `TAR_EXCLUDES` value feeds the backup tar and the new copy
  tar, replacing `cp -R`.
- `.gitignore` — `.agents/worktrees/`.

Guzia-high-school:

- `.agents/results/office-kit-installer-excludes.md` (this file).

Nothing under `apps/`; the founder's `agents/critic/*.md` WIP was not touched,
staged, or committed.

## Verify

### Reproduction, measured before the fix

A real worktree was added inside the kit worktree, then a 50M blob was placed
where a worktree's build output goes:

```sh
git worktree add --detach .agents/worktrees/repro-bloat a1f12ee
mkdir -p .agents/worktrees/repro-bloat/.agents/zolly/tool/target
dd if=/dev/zero of=.agents/worktrees/repro-bloat/.agents/zolly/tool/target/blob.bin \
  bs=1M count=50
```

`HOME=/tmp/insthome-before ./install.sh /tmp/instcheck-before --no-binary \
--no-systemd --yes --founder Test` on `a1f12ee` before the edit:

```
exit=0
52M     /tmp/instcheck-before/.agents
52M     /tmp/instcheck-before/.agents/worktrees/repro-bloat
89      files under .agents/worktrees
-rw-r--r-- 1 khan khan 52428800 .../repro-bloat/.agents/zolly/tool/target/blob.bin
```

The 50M blob and the whole checkout were installed into the target.

### After the fix, same worktree still open

```
exit=0
420K    /tmp/instcheck-after/.agents
worktrees files: 0
runs files: 0
no zolly/tool/target
```

`worktrees/` and `runs/` still exist as empty runtime directories because the
installer creates them at the `RUNTIME_DIRS` step; they contain 0 files, and
the template copy added nothing to them.

### `./test.sh` with the worktree open — the acceptance test

```
$ ./test.sh
Ran 72 tests in 8.231s
OK
test_sh_exit=0
```

### Then remove the worktree and run it again

```sh
git worktree remove --force .agents/worktrees/repro-bloat
```

```
$ ./test.sh
Ran 72 tests in 8.280s
OK
test_sh_exit=0
```

### `cargo test`

```
$ cd tool && cargo test
test result: ok. 170 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
cargo_exit=0
```

`sh -n install.sh` → ok.

### The reviewer's failure did not reproduce here; the cause did

On this machine `./test.sh` passed **before** the fix too (72 tests, 9.223s,
exit 0) with the worktree open, because `/tmp` had 4.4G free. The reviewer's
`cp: error writing … Disk quota exceeded` is the same defect under a quota:
the copy writes every worktree byte. The shipped-size measurement above is the
environment-independent proof; the suite's green run with a worktree open is
now independent of how much disk is left.

### The merged `office-memory-compact` `## Verify` claim

That result said:

```
$ ./test.sh
...
Ran 70 tests in 10.165s
OK
```

It needs rewording on two counts, and the corrected form is:

- **The count is stale on current `main`.** On `a1f12ee` the suite reports
  **72** tests, not 70; PR #4 added tests after the memory result was written.
  The command reproduces and is green, but the literal count does not.
- **The green was conditional on the machine's state.** On a quota-limited
  machine it was true only with no worktree open. With this fix it is true in
  both states — the two `./test.sh` runs above, same tree, worktree open and
  then removed, are the evidence.

Corrected claim for `office-memory-compact`: *`./test.sh` on `a1f12ee` → `Ran
72 tests … OK`, exit 0; after the installer exclusion fix this holds with a
worktree open and after it is removed.* This supersedes the 70-test sentence;
the memory compact itself is unchanged and its tests pass.

## Commit

- Kit: branch `foreman/office-kit-installer-excludes`, commit
  `f6efcf39ceb4816a654b132dcdba433f265a0dc0`, PR
  <https://github.com/khanshifaul/zolly/pull/7>. **Not merged.**
- Guzia: `18cc76ec98c47677862e9f71103bfdcdc735180a` (the commit that added
  this file, recorded by the follow-up commit on this branch, because a commit
  cannot name its own SHA).

## Blockers

None technical. **The kit PR is not merged.** The kit has no reviewer seat, so
PR #7 needs the bare omp seat in pane `wH:p1` (cwd `/home/khan/Projects/zolly`)
or the founder to review and merge it. Neither repo's `main` was touched.

## Why the two installer paths had drifted

The backup tar was written when `--force` was found to be able to lose office
state, and the three exclusions were added there with their justification.
The copy path predates that and stayed `cp -R`, on the assumption that a
template is just the tracked kit — true for the archive path, where untracked
worktrees never arrive, but false for a clone, which is how the developer and
the kit's own suite run it. One behaviour encoded twice, in two different
programs, is how one copy gets fixed and the other is forgotten; the repair is
one `TAR_EXCLUDES` value read by both tar pipes, not a second exclusion list.
