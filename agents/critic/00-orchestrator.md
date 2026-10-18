# UX CRITIC — Guzia High School (http://localhost:3004/)

Five role-scoped critic agents. Every critic drives a **real browser in a split terminal pane** (`terminal-browser open --split right --size 0.45`) beside the conversation, and uses the **radio/interaction plugin** (`click @<radio-id>`, `fill @<input-id>`, `eval`, `snapshot`) to manipulate form controls — segmented P/A/L radios, grade-band selects, audience toggles, demo-credential chips, etc.

| File | Role | Demo credentials |
|------|------|------------------|
| `01-guest-public.md` | Guest / public (no session) | — |
| `02-admin.md` | Admin | admin@guziahs.edu / password123 |
| `03-teacher.md` | Teacher | teacher1@guziahs.edu / password123 |
| `04-student.md` | Student | student01@guziahs.edu / password123 |
| `05-parent.md` | Parent | parent01@guziahs.edu / password123 |

## How to run a critic

1. Start the stack: `docker compose up -d && bun run db:seed && bun run dev` (API 4000, web 3004).
2. Paste one role prompt into an agent. The agent opens `http://localhost:3004/` in a split pane and drives it with `terminal-browser action -- snapshot|click|fill|eval|done`.
3. For cross-role verification (teacher→student, admin→parent), the critic opens a **second tab** in the same split browser and logs in as the counterparty, then compares both panes.

## Pane layout contract (every critic)

- `terminal-browser open http://localhost:3004/ --split right --size 0.45` — browser lives beside the conversation; never full-screen.
- `terminal-browser ls` — list tabs; open a second tab via `terminal-browser new-tab` for the counterparty role when cross-session checks are needed.
- Every significant action is followed by `snapshot` so findings carry visual evidence.
- End with `terminal-browser action done` to clear the acting indicator.

## Radio / interaction plugin contract

- Locate radio/segmented controls via `snapshot`, note their element ids (`@e14` style), then `click @<id>` to select.
- Verify radio state via `eval "document.querySelector('input[name=X]:checked').value"` or `snapshot`.
- Applies to: P/A/L attendance segmented buttons, grade-band selects, audience toggles, demo-credential chips, yes/no toggles.

## Common target contract

- App: `http://localhost:3004/` | API: `http://localhost:4000/api` | Swagger: `http://localhost:4000/api/docs`
- Every finding: page/URL, role, what was tried, expected vs actual, severity (critical/high/medium/low), evidence (snapshot ref or DOM eval), fix.
- **Simulation + loop rule:** when a flaw is found, probe 2–3 adjacent scenarios (edge inputs, rapid repeats, back/forward, role-switch, counterparty tab) before moving on.

## Output format (every critic)

```
# <Role> UX Critique — http://localhost:3004/ (<email>)

## Pane & radio setup
- split pane opened: yes/no ; second tab for counterparty: yes/no ; radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page/feature] ... expected vs actual ... severity ... evidence ... fix:

## Simulation log
- scenario ... result → adjacent probes ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```
