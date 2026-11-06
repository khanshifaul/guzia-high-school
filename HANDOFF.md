# Handoff

The resume point for the next session. Read from the **tail**: the newest
session is the last one.

---

## 2026-10-22, evening — day close

Measured during the close, 17:05 +06. Nothing below is carried over from a
report; each line was read from git, `gh`, herdr or systemd at close time.

### Landed

- **guzia-high-school** — 16 PRs merged today (#10–#25). `origin/main` =
  `7ccd49b`; local `main` = `7ccd49b`; 0 unpushed commits.
- **khanshifaul/zolly (the kit)** — 9 PRs merged today (#3–#11).
  `origin/main` = `e8ec1fc` (#7).
- **Installed binary** — `~/.local/bin/zolly` dated 15:20; the
  `zolly@guzia-high-school.service` listener restarted 15:20:38. Both are
  newer than every merge today, so the fix-is-live check passes for this host.
- The office layer was reinstalled at 14:41 from the kit's working tree
  (branch `rules/fix-live-two-checks`) — memory was preserved by the
  installer's restore step (`D-0001`…`D-0004`, `C-0001` all present).

### In flight

- **PR #26 — `foreman/generic-category` @ `5f0e24e`.** One commit, MERGEABLE,
  all checks green (CodeRabbit, GitGuardian, Vercel, Vercel Preview). The
  founder's wording change: the narrow category is on **0** lines of the
  tracked surface at the branch head, against **4** lines on `origin/main`.
  Not merged because the reviewer seat cannot run (below).
- The checkout is **back on `main`** at `7ccd49b`. The PR branch is untouched
  on `origin`.

### Blocked

- **The reviewer seat is blocked** (`agent_blocked`). Its last turn died with
  `429 Upstream model provider is temporarily unavailable`, and its context
  compaction failed with `Couldn't connect to 127.0.0.1:8080`. Measured at
  close: `zolly reviewer office-brief-decontaminate` →
  `herdr agent prompt failed: agent_blocked`; `herdr agent send-keys … esc`
  and `… enter` did not clear it. The merge door is shut until the seat is
  restarted or the provider is reachable.
- **Kit PR #13** (`rules/verify-output-not-count`, `60bdd8f`) and **#14**
  (`rules/fix-live-two-checks`, `5474335`) — both MERGEABLE, both without a
  reviewer: the kit has no office, so the door is the founder or the bare seat
  at `wH:p1`.

### Not started — now filed

- `queue/office-kit-substitution-scope.md` — the installer's placeholder pass
  rewrites every `.md` under `.agents/`, including the committed records in
  `.agents/results/`. Measured today: the 14:41 reinstall rewrote
  `results/office-kit-load-line.md` (`{{FREQUENCY}}` → `guzia-high-school`)
  and copied an untracked `.agents/results/.gitkeep`. Gate: auto.

### Uncommitted at close (exact)

```
 M .agents/results/office-kit-load-line.md      <- installer substitution, see queue entry
 M agents/critic/00-orchestrator.md             <- founder's, accepted by D-0002
 M agents/critic/01-guest-public.md             <- founder's, accepted by D-0002
 M agents/critic/02-admin.md                    <- founder's, accepted by D-0002
 M agents/critic/03-teacher.md                  <- founder's, accepted by D-0002
 M agents/critic/04-student.md                  <- founder's, accepted by D-0002
 M agents/critic/05-parent.md                   <- founder's, accepted by D-0002
 ?? .agents/results/.gitkeep                    <- installer copied the template's
 M HANDOFF.md                                   <- this file
 ?? tomorrow_schedule.md
```

`zolly foreman` and `zolly close` refuse dispatch while the tree is dirty.
That refusal is the accepted state per D-0002, not a fault to route around.

### Record gap (not work)

`queue/office-brief-privacy.md` says `status: done` but there is no
`results/office-brief-privacy.md`; its work is recorded inside
`results/office-brief-decontaminate.md`. Nothing was re-run.

### The single next action

**Get the reviewer seat answering, then merge PR #26.** Once it replies,
`zolly reviewer office-brief-decontaminate` must return
`PASS: merged <sha> — <url>`; then `git checkout main && git pull --ff-only`,
`zolly close office-brief-decontaminate`, `zolly gc`.

### Suggested order for tomorrow

1. Reviewer seat → PR #26 merged. Fix the seat first if it is still blocked
   (restart the pane; it is on standby, not mid-review). `gate: auto`
2. `git checkout main`, pull, `zolly close office-brief-decontaminate`,
   `zolly gc` — branch and worktree both gone. `gate: auto`
3. Kit PRs #13 and #14 → founder or the bare seat at `wH:p1`. `gate: human`
4. `office-kit-substitution-scope` → `zolly foreman`. `gate: auto`
5. The 6 `agents/critic/*.md` stay dirty until the founder commits or drops
   them (D-0002); dispatch keeps refusing until then. `gate: human`

### What dies with the session

The reviewer pane's scrollback and its half-finished compaction; the pending
error box. Nothing else: the queue, results, memory, this file and the
schedule are on disk. The other two offices' ponder timers
(`pijunctionbd`, `zylosync`) were left running — this close covered
`guzia-high-school` only.

---

## 2026-10-23, evening — day close

Measured at close, 23:05 +06. Every line below was read from git, `gh`, herdr
or systemd in this run.

### Landed

- **guzia** — main is `c0f6765`, clean apart from this file and the schedule.
  Today's merges: `#26` `094552f` (public wording; body screened 0 category /
  0 token), `#27` `696bd9f` (installer placeholder-scope record), `#28`
  `473a0ef` (six critic briefs retired, this file landed, `.gitkeep`), `#29`
  `e1940e7` (seat-replay result), `#30` `c0f6765` (login cold-start retry,
  merged after this close was written).
- **kit** — main is `581c1c3`: `#22` `c16d449` (the installer never rewrites
  records), `#23` `57dd6ca` (a gate read from a task branch), `#24` `581c1c3`
  (boot prompt is the first turn; `agent_wait` accepts `done`).
- **binary** — rebuilt from `581c1c3`, 9757400 bytes at 22:58, installed to
  `~/.local/bin/zolly` (`cmp` identical), `zolly@guzia-high-school.service`
  restarted and active. First live proof: `zolly reviewer
  product-login-retry` exited 0 in 272 s and returned `PASS: merged` — the
  first reviewer call today that did not time out after its merge.
- **other offices** — `pijunctionbd` and `zylosync` still hold the old deleted
  binary (started 12:40:09). Not touched: they are separate offices. Restart
  their units to give them the same fix.
- **office** — 12/12 queue entries done, 0 worktrees, 0 open PRs in both
  repos. The six critic briefs are worker personas at
  `.agents/worker/critic*.md`; the rewritten originals are in `stash@{0}`.

### Filed at close, then landed

- `product-login-retry` was filed as a queued brief at this close and merged
  later the same evening as `c0f6765` (#30): an opt-in retry on 502/503/504
  with a "server is waking" message, 7 new client tests. It is on `main`, and
  Vercel deploys `main`, so the deployed web app carries it. No API change.
- Render's `WEB_ORIGIN` is still the dev value. A dashboard change, not a repo
  change. `gate: human`.

### Single next action

Land this file and `tomorrow_schedule.md` through the reviewer — both are
uncommitted on `main`, and `zolly close` refuses while they are dirty. Then
close `product-login-retry`; its ledger line is the only thing that close
cannot finish tonight.

### What dies with the session

The three seat panes and their scrollback. Not the queue, results, memory,
this file, the schedule, the installed binary or the listener. The guzia
ponder timer is stopped; `pijunctionbd` and `zylosync` are separate offices
and were not touched.

---

## 2026-11-04, morning — day close (work dated 2026-11-03)

Every number below was read during this close: `git`, `gh`, the test runner,
`herdr`, systemd. Result files were treated as claims, not evidence.

### Landed — verified

- `origin/main` = `3499505`, local `main` = `3499505`, 0 unpushed commits,
  working tree clean.
- Five PRs merged on 2026-11-03, all `MERGED` per `gh`:
  - #36 `30a530e` — LLM provider hardening: key truth from `apiKeyEnc`, typed
    503s, 30 s/90 s timeouts, bounded retries, truncation detection, structured
    call log, `GET /api/ai/health`, env-only provider.
  - #37 `77a9700` — question-paper export to Unicode DOCX and PDF (Typst).
  - #38 `945beb1` — RAG: generated `tsvector` + GIN on the keyword arm,
    idempotent re-ingest, wider source coverage.
  - #39 `d123c03`, #40 `3499505` — export fonts: DOCX `w:ascii`/`w:hAnsi`
    Times New Roman, `w:cs` Kalpurush, `w:sz` + `w:szCs`; PDF Liberation Serif
    + Kalpurush.
- Tests re-run at close on `main`: **240 passed, 25 suites, exit 0**.
  (`bun --filter @guzia/api test`.)

### In flight

Nothing. No worker, no worktree, no `*.run`, 0 commits in the last 2 h.

### Not verified

- Live behaviour of #36–#40: the Render service has not redeployed, so the
  export route and the new provider error mapping are not proven in production.
- PDF/DOCX artifact sizes and page counts come from the task result file; the
  files were not re-rendered at close. The font elements in the renderer and
  their test assertions were read directly in the tree.

### Not started — now filed

- `db-migration-replay-repair` (`.agents/queue/`, `gate: human`) — migrations
  do not replay: `20261026193825_add_hero_slider` alters `HeroSlide` before
  `20261027140000_add_hero_slider` creates it, so `prisma migrate dev` cannot
  build a shadow database and a fresh `migrate deploy` fails. Needs a founder
  decision because it rewrites applied migration history.

### Errors made this day — unhedged

1. I repeated "215 tests pass" from a result file without re-running. At close
   the suite failed 2 of 25: `docx` was in `package.json` but not in the local
   `node_modules`, so two suites could not compile. `bun install
   --frozen-lockfile` fixed it; the real count is 240.
2. I reported the live API as "not answering" after two probes when it was a
   Render free-tier cold start; the third call, a login, returned 200 in 1.9 s.
3. I sent the DOCX font correction after the worker had started building, which
   cost a second PR (#39 then #40).

### Single next action

The founder deploys the API (Render) so #36–#40 are actually running; the
domain `WEB_ORIGIN` and the DeepSeek key travel in the same dashboard visit.
For agents, the next move is the founder's ruling on the migration repair.

### What dies with the session

The Zolly and foreman panes and their scrollback. Not the queue, results,
memory, this file, the schedule, `main` or the installed binary. The guzia
ponder timer is stopped for the night.
