---
id: office-kit-substitution-scope
title: The installer's placeholder pass rewrites office records, not only templates
status: done
gate: auto
---

## Summary

`substitute()` in `install.sh` ran `sed -i` over every `.md`, `.toml`, `.sh`
and `.py` under `.agents/` with no exclusion list, and it runs **after** a
reinstall restores `results`, `queue`, `days`, `events`, `inbox`, `trash` and
`memory/archive` from the backup. A restored record containing a placeholder
was therefore rewritten in place — the `M` reported on
`.agents/results/office-kit-load-line.md` in the guzia checkout was that
defect.

The fix adds one `RECORD_EXCLUDES` value next to `TAR_EXCLUDES` and prunes
those paths in the substitution `find`. `memory/` itself still renders because
it is a template; only `memory/archive/` is history. The list is deliberately
separate from `TAR_EXCLUDES`: the backup and copy paths must keep capturing
records, or `--force` would stop restoring them.

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-kit-substitution-scope`):

- `install.sh` — `RECORD_EXCLUDES="results queue days events inbox trash memory/archive"`;
  `substitute()` builds `\( -path … \) -prune -o -type f …` so `sed` never
  reaches a record.
- `tests/test_install.py` — regression test
  `test_force_does_not_rewrite_records_but_still_renders_templates`.

Guzia-high-school:

- `.agents/results/office-kit-substitution-scope.md` (this file).

Nothing under `apps/` or any other guzia path was touched.

## Verify

### Fresh target, two installs, measured at kit commit `cf0c41b` + this patch

```sh
WT=/home/khan/Projects/zolly/.agents/worktrees/office-kit-substitution-scope
T=/tmp/sub-scope-probe
rm -rf "$T"; mkdir -p "$T/home"
git -C "$T" init -q
git -C "$T" config user.email t@example.com
git -C "$T" config user.name Test
git -C "$T" commit -q --allow-empty -m init
HOME="$T/home" "$WT/install.sh" "$T" --yes --no-binary --no-mcp --no-telegram \
  --no-systemd --no-ponder --name probe --founder Probe
printf '%s\n' '{{FREQUENCY}} {{PROJECT_NAME}} {{FOUNDER}}' > "$T/.agents/results/probe.md"
printf '%s\n' '{{FOUNDER}}' > "$T/.agents/memory/archive/probe.md"
git -C "$T" add -A && git -C "$T" commit -q -m records
echo "== before"
sha256sum "$T/.agents/results/probe.md" "$T/.agents/memory/archive/probe.md"
HOME="$T/home" "$WT/install.sh" "$T" --yes --force --no-binary --no-mcp \
  --no-telegram --no-systemd --no-ponder --name probe --founder Probe
echo "== after"
sha256sum "$T/.agents/results/probe.md" "$T/.agents/memory/archive/probe.md"
echo "== record"; cat "$T/.agents/results/probe.md"
echo "== archive"; cat "$T/.agents/memory/archive/probe.md"
echo "== status"
git -C "$T" status --porcelain -- .agents/results/ .agents/memory/archive/
echo "== config"
grep -E '^(frequency|founder|base_branch|project)' "$T/.agents/zolly/config.toml"
echo -n "== workflow tokens "; grep -c '{{' "$T/.agents/rules/workflows.md" || true
echo -n "== founder.md hits "; grep -c 'Probe' "$T/.agents/memory/founder.md" || true
```

```
== before
20952374678adba1ab43fc5123a3fe7066208dbc6b97512ab0adddecb7107cee  /tmp/sub-scope-probe/.agents/results/probe.md
943c4a24130d62655317d2c25cdb4c8b55e3adfa3e76a08a14f2d285541f954f  /tmp/sub-scope-probe/.agents/memory/archive/probe.md
== after
20952374678adba1ab43fc5123a3fe7066208dbc6b97512ab0adddecb7107cee  /tmp/sub-scope-probe/.agents/results/probe.md
943c4a24130d62655317d2c25cdb4c8b55e3adfa3e76a08a14f2d285541f954f  /tmp/sub-scope-probe/.agents/memory/archive/probe.md
== record
{{FREQUENCY}} {{PROJECT_NAME}} {{FOUNDER}}
== archive
{{FOUNDER}}
== status
== config
frequency = "probe"
founder = "Probe"
base_branch = "master"
project = "sub-scope-probe"
== workflow tokens 0
== founder.md hits 2
```

`== status` printed nothing, so both record files are byte-identical across
the reinstall. The template still rendered: `config.toml` carries `probe` and
`Probe`, `rules/workflows.md` has zero remaining `{{` tokens, and
`memory/founder.md` carries the founder name twice.

### Every restored record directory

The same probe with one file in each directory the restore path names:

```sh
for d in results queue days events inbox trash memory/archive; do
  mkdir -p "$T/.agents/$d"
  printf '%s\n' '{{FREQUENCY}}' > "$T/.agents/$d/probe.md"
done
# commit, reinstall --force
for d in results queue days events inbox trash memory/archive; do
  printf '%-14s %s\n' "$d" "$(cat "$T/.agents/$d/probe.md")"
done
git -C "$T" status --porcelain -- .agents/results/ .agents/queue/ .agents/days/ \
  .agents/events/ .agents/inbox/ .agents/trash/ .agents/memory/archive/
```

```
results        {{FREQUENCY}}
queue          {{FREQUENCY}}
days           {{FREQUENCY}}
events         {{FREQUENCY}}
inbox          {{FREQUENCY}}
trash          {{FREQUENCY}}
memory/archive {{FREQUENCY}}
```

`git status` printed nothing. On the same fresh target, before any record was
written, `grep -rn '{{[A-Z_]*}}' .agents --include='*.md' --include='*.toml'`
printed `none`, so every template file still rendered.

### The same probe against pre-fix `install.sh` from `cf0c41b`

```sh
git -C "$WT" show cf0c41b:install.sh > "$WT/.bugcheck-install.sh"
chmod +x "$WT/.bugcheck-install.sh"
T=/tmp/sub-bug-probe; rm -rf "$T"; mkdir -p "$T/home"
git -C "$T" init -q; git -C "$T" config user.email t@example.com
git -C "$T" config user.name Test; git -C "$T" commit -q --allow-empty -m init
HOME="$T/home" "$WT/.bugcheck-install.sh" "$T" --yes --no-binary --no-mcp \
  --no-telegram --no-systemd --no-ponder --name probe --founder Probe
printf '%s\n' '{{FREQUENCY}}' > "$T/.agents/results/probe.md"
git -C "$T" add -A; git -C "$T" commit -q -m records
HOME="$T/home" "$WT/.bugcheck-install.sh" "$T" --yes --force --no-binary \
  --no-mcp --no-telegram --no-systemd --no-ponder --name probe --founder Probe
echo "pre-fix record content: $(cat "$T/.agents/results/probe.md")"
git -C "$T" status --porcelain -- .agents/results/
rm -f "$WT/.bugcheck-install.sh"
```

```
pre-fix record content: probe
 M .agents/results/probe.md
```

The defect reproduces and the probe distinguishes fixed from broken.

### A target path containing glob characters

The find runs from `.agents/`, so the prune patterns are literal paths, not
globs. Measured with the target `/tmp/sub-scope-[probe]`:

```
bracket target record: {{FREQUENCY}}
bracket target config: frequency = "probe"
```

### Kit suite

```sh
$ ./test.sh
Ran 73 tests in 7.101s
OK
== mcp handshake
handshake ok
```

`sh -n install.sh` → ok, `python3 -m py_compile tests/test_install.py` → ok.
`dash` is not installed on this machine, so `sh -n` used bash; the CI `dash
install smoke` job is the dash check. The construct relies only on POSIX
behaviour (function-local positional parameters).

## Commit

- Kit: branch `foreman/office-kit-substitution-scope`, commit
  `b7706327698353a2424da7a9d945e662c273b432`, PR
  <https://github.com/khanshifaul/zolly/pull/22>. **Opened, not merged; needs
  the founder.**
- Guzia: `cb3531272852b95c12e0fe64b143a2d2c62672fa` (the commit that added
  this file, named by the follow-up commit on this branch because a commit
  cannot name its own SHA).

## Blockers

None technical. **The kit PR is not merged.** The kit has no office and no
reviewer seat, so PR #22 needs the founder or the bare `omp` seat — not a
reviewer. The guzia PR is the reviewer's door and carries only this file.
Neither repo's `main` was touched.

## Why the exclusion list is separate from TAR_EXCLUDES

`TAR_EXCLUDES` feeds the backup tar and the template copy tar. Records have to
be in the backup (that is how `--force` restores them) and must not be in the
template copy (the template holds none). The substitution pass is a third path
with a third question — "is this a template?" — so it gets its own one-line
list. Folding records into `TAR_EXCLUDES` would empty the backup of exactly the
files the restore then tries to put back.
