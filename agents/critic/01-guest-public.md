# UX CRITIC — Guest / Public (no session)
**Target:** `http://localhost:3004/`  |  **Layout:** split pane right 0.45  |  **Plugin:** radio/interaction via `click @<id>`  |  **Focus:** features + UX flaws

## Mission
Critique the public surface as an unauthenticated guest: landing page, login, 4-step admissions wizard. Drive the browser in a split pane beside the conversation. Use snapshot → locate radio/input ids → click/fill → snapshot to capture every state change. Use simulation loops: on any flaw, probe 2–3 adjacent scenarios before moving on.

## Setup (pane layout)
1. `terminal-browser open http://localhost:3004/ --split right --size 0.45`
2. `snapshot` the homepage. Record URL, title, hero, stats strip, notices preview, CTA → admissions/login.
3. `terminal-browser ls` to confirm the active tab id for subsequent `action --tab <id>` calls.

## Scenario A — Landing page (guest)
1. Click every nav link in the 3-layer sticky navbar (utility bar, brand block, link row). After each click: `snapshot`, verify no 404/hang.
2. Toggle language (EN/BN) — this is a radio/toggle control: snapshot, locate the toggle id, `click @<id>`, verify visible labels switch.
3. Toggle theme — same radio pattern: `click @<theme-toggle-id>`, verify dark/light switch and persistence.
4. Narrow viewport via `eval` on innerWidth or open a second tab at a narrow width. Verify navbar collapses into mobile drawer; drawer opens/closes.
5. Click admissions CTA and login CTA. Verify correct destination pages.

## Scenario B — Login page (guest)
1. Open `/login`. `snapshot` the centered card.
2. Click each demo-credential chip (Admin, Teacher, Student, Parent). Chips act as radio/fill triggers: after each, `snapshot` and `eval` the email/password field values to confirm they filled.
3. Submit with empty fields. `snapshot`; verify inline error banners appear (no toast).
4. Submit wrong password. `snapshot`; verify clear error banner, not silent failure or 500.
5. Submit valid admin creds (`admin@guziahs.edu` / `password123`). Verify redirect to `/admin` and session cookie set.

## Scenario C — Admissions 4-step wizard (guest)
1. Open `/admissions`. `snapshot` step 1.
2. Walk all 4 steps: student info → guardian info → academic choice → review+submit. After each step transition: `snapshot`, verify progress bar advances.
3. Review step: verify all four step data are shown editable (inputs/radios populated).
4. Submit invalid data (bad email, short name, missing required). `snapshot`; verify per-field inline zod errors, step does not advance.
5. Submit valid data. `snapshot` success screen; verify application ID shown + clear next step.
6. Browser back after submit. `snapshot`; verify no silent resubmit or confusing state.
7. Rapid double-submit. `snapshot`; verify no duplicate application or crash.

## Radio/interaction checks (mark each ✓/✗)

- [ ] Language toggle is a radio/toggle; `click @<id>` switches visible labels
- [ ] Theme toggle is a radio/toggle; persists across navigation
- [ ] Demo-credential chips fill email+password fields (verify via `eval`)
- [ ] Admissions step radios/selects respond to `click @<id>`
- [ ] Validation errors are per-field, inline, snapshot-captured
- [ ] Success screen shows application ID
- [ ] Back after submit does not resubmit
- [ ] Double-submit is guarded

## Loop rule
On any flaw (silent validation, broken link, back-button resubmit), probe 2–3 variations: different field, the other demo chip, the other language, faster/slower interaction. Record each result with `snapshot`.

## Output
```
# Guest/Public UX Critique — http://localhost:3004/

## Pane & radio setup
- split pane right 0.45: yes/no ; radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page] ... expected vs actual ... severity ... evidence: snapshot/eval ... fix:

## Simulation log
- C3 empty submit ... result → adjacent probes C3a (bad email), C3b (missing name) ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```

End with `terminal-browser action done`.
