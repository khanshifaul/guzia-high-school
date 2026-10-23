---
id: office-seat-replay
title: A booted seat replays parked bus mail as fresh work; the wait never settles
status: done
gate: auto
---

## Summary

Two defects in the kit's seat path, measured on `khanshifaul/zolly` at
`57dd6ca` (the worktree HEAD matched the dispatch base).

- **(b) wait predicate.** `herdr::agent_wait` ran `herdr agent wait … --until
  idle`. An omp seat that has finished a turn reports `agent_status: "done"`,
  so `agent_prompt_with_reply`'s settle loop never stopped and `zolly
  reviewer` failed with `Agent … did not become idle in time` after the work
  had merged. The wait now names both resting states: `--until idle --until
  done`. `blocked` stays excluded — an agent waiting for input has not
  finished. **This change closes the timeout.**
- **(a) replay.** The relay parks deliveries sent while a seat has no live
  pane as `pull` + `no live pane`; `radio join`'s catch-up only demotes rows
  still `pending`, so the parked rows survive it and the next relay tick
  re-promotes the whole backlog into the fresh agent. `init` now
  acknowledges the handle's queued envelopes **before the tab exists**, using
  the plugin's own acknowledgement path (`radio show <id> --by <handle>`
  marks the delivery `delivered`). **This change closes the replay**: the
  seat's first turn is its boot prompt, and no backlog is pushed.

No plugin change and no guzia product change. The change is source-side; the
installed binary was not rebuilt or installed.

## Files changed

Kit (`khanshifaul/zolly`, branch `foreman/office-seat-replay`, commit
`51c5c3d`):

- `tool/src/herdr.rs` — `agent_wait_args` names both resting states;
  `agent_wait` consumes it; regression test `wait_accepts_both_resting_states`.
- `tool/src/main.rs` — `inbox_ids` and `radio_drain`, called from `open_seat`
  before `agent_start_with_retry`; regression tests for the parser and the
  chrome it must ignore (`inbox_ids_read_the_rows_and_ignore_the_chrome`,
  `inbox_ids_is_empty_when_nothing_is_queued`).

Guzia-high-school:

- `.agents/results/office-seat-replay.md` (this file). Nothing else.

## Verify

### (b) measured before the change, on the live seat

```sh
$ herdr agent get pr-reviewer-guzia-high-school
{"id":"cli:agent:get","result":{"agent":{… "agent_status":"done" …}}}
$ herdr agent wait pr-reviewer-guzia-high-school --until idle --timeout 3000
{"error":{"code":"timeout","message":"timed out waiting for agent status"},"id":"cli:agent:wait"}
$ echo $?
1
$ herdr agent wait pr-reviewer-guzia-high-school --until idle --until done --timeout 3000
{"id":"cli:agent:wait","result":{"agent":{"agent_status":"done",…}}}
$ echo $?
0
```

### (a) replay, and its fix, on scratch offices

Two throwaway offices were installed under `/tmp` — frequencies
`seat-replay-old` (installed binary) and `seat-replay-new` (binary built from
`51c5c3d`). In each: boot the seats, close the reviewer tab, send two PMs to
`pr-reviewer` as `foreman`, wait for the relay to park them (`pull` + `no
live pane`), then re-init. No live seat was touched beyond the read-only
`agent get` / `agent wait` checks. Both scratch workspaces, tabs, radio
handles and directories were removed afterwards.

Pre-fix (installed `~/.local/bin/zolly`, which predates `51c5c3d`):

```sh
$ sqlite3 ~/.local/share/herdr-radio/radio.db \
    "select id,status,last_error,delivered_at from deliveries \
     where target_ws='freq.seat-replay-old' and target='pr-reviewer' order by id desc limit 2;"
id   status     last_error     delivered_at
512  pending
511  delivered                 2026-10-23T14:43:20.944+00:00
$ python3 …   # user turns of the reviewer session for /tmp/seat-replay-old
5  2026-10-23T14:42:50.319Z '<file name="…/boot/pr-reviewer.md">…'
23 2026-10-23T14:43:20.693Z '[RADIO_MESSAGE id=511 kind=pm frequency=seat-replay-old from=foreman to=pr-reviewer reply=not-required]…'
```

The boot prompt is turn 5; the parked mail arrives as a user turn at 23. That
is the replay.

Post-fix (same scenario, binary built from `51c5c3d`):

```sh
$ zolly init
radio: pr-reviewer — drained 2 queued envelope(s)
radio: pr-reviewer — pr-reviewer joined on frequency seat-replay-new (herdr:w2W:p5)
$ sqlite3 … "select id,status,delivered_at from deliveries \
             where target_ws='freq.seat-replay-new' and target='pr-reviewer' order by id desc limit 2;"
514  delivered  2026-10-23T14:44:16.626+00:00
513  delivered  2026-10-23T14:44:16.760+00:00
$ grep 'seat-replay-new:pr-reviewer' ~/.local/share/herdr-radio/relay.log | tail -2
[2026-10-23T14:44:06.701+00:00] #513 -> freq.seat-replay-new:pr-reviewer: no live pane, left for pull
[2026-10-23T14:44:06.701+00:00] #514 -> freq.seat-replay-new:pr-reviewer: no live pane, left for pull
$ python3 …   # user turns of the new reviewer session
5  2026-10-23T14:44:22.134Z '<file name="…/boot/pr-reviewer.md">…'
user turns: 1
$ sqlite3 … "select id,from_handle,to_handle from messages where from_ws='freq.seat-replay-new';"
513|foreman|pr-reviewer|PROBE-REPLAY-1…
514|foreman|pr-reviewer|PROBE-REPLAY-2…
```

Both deliveries are `delivered` at the drain, before the tab existed. The
relay never re-promoted or pushed them, the seat's only user turn is its boot
prompt, and `radio log` gained no envelope from that seat. That is the
acceptance criterion.

### Both fixes exercised through `zolly reviewer` on a scratch seat

```sh
$ cd /tmp/seat-replay-new && <worktree>/tool/target/debug/zolly reviewer probe-seat-replay --timeout-ms 45000
OBJECTION: nothing to review — `probe-seat-replay` does not exist anywhere in the tree…
real 0m40.394s

$ cd /tmp/seat-replay-old && ~/.local/bin/zolly reviewer probe-seat-replay --timeout-ms 45000
Caused by:
    0: Agent pr-reviewer-seat-replay-old did not become idle in time
    1: herdr agent wait failed: {"error":{"code":"timeout","message":"timed out waiting for agent status"},"id":"cli:agent:wait"}
real 0m45.082s
```

The fixed binary returns the reply; the old one reproduces the reported
timeout after the agent had already answered.

### Kit suite

```sh
$ ./test.sh
Ran 73 tests in 6.963s

OK
== mcp handshake
initialize ok: zolly-mcp 0.1.0 (protocol 2024-11-05)
tool zolly_say: required=['text']
tool zolly_status: required=-
handshake ok
```

```sh
$ cd tool && cargo test --offline
test result: ok. 185 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

`./test.sh` is the Python/shell suite; the Rust tests run under `cargo test`.
Three Rust tests were added and pass; the suite total moved from 182 to 185.

### The running binary does not carry the fix

`~/.local/bin/zolly` was not rebuilt or installed from `51c5c3d`. The office
keeps both defects until a rebuild: `zolly reviewer` still waits on `idle`
and still replays parked mail. Two checks prove a later rebuild carries it:

1. the live listener's `/proc/<pid>/exe` resolves to the rebuilt
   `~/.local/bin/zolly` (the listener lock names the pid); and
2. `stat -c %y ~/.local/bin/zolly` is newer than the fix commit `51c5c3d`.

## Commit

- Kit: `51c5c3d6efa9f1c7979ea4bfb8cf46d50959b0b7` on
  `foreman/office-seat-replay`, PR
  <https://github.com/khanshifaul/zolly/pull/24>. **Opened, not merged.** The
  kit has no reviewer seat, so this PR's door is the founder or the bare seat
  — not a reviewer.
- Guzia: `62e7202` added this file on branch `foreman/office-seat-replay`
  against `main` (`473a0ef`); PR
  <https://github.com/khanshifaul/guzia-high-school/pull/29>. That branch
  carries only this file. A commit cannot name its own SHA, so the PR link
  arrives in the follow-up commit on the same branch.

## Blockers

None technical. **The kit PR is not merged** and needs the founder or the bare
seat. The guzia PR carries only this result file. Neither repo's `main` was
touched.
