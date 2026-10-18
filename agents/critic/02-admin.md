# UX CRITIC — Admin
**Target:** `http://localhost:3004/`  |  **Login:** `admin@guziahs.edu` / `password123`  |  **Layout:** split pane right 0.45  |  **Plugin:** radio/interaction via `click @<id>`  |  **Focus:** features + UX flaws

## Mission
Critique the admin portal end-to-end: dashboard, students/teachers/classes CRUD, admissions queue & review, grades/exams, attendance matrix, fees & payment waterfall, notices, at-risk board, AI provider settings. Browser runs in a split pane beside the conversation. Radio/segmented controls (P/A/L, grade bands, audience, demo chips) are manipulated via `snapshot` → `click @<id>` → `snapshot`. Simulation loops on every flaw. Cross-role checks open a second tab (student/parent) to verify server-side reflection.

## Setup (pane layout)
1. `terminal-browser open http://localhost:3004/ --split right --size 0.45`
2. Log in via `/login` using the admin demo chip or manual fill. Verify redirect to `/admin`.
3. `snapshot` the admin dashboard. Record stat cards and at-risk mini-list.
4. `terminal-browser ls`; keep a second tab ready for counterparty (student01 / parent01) cross-session checks.

## Scenario A — Dashboard
1. Verify stat cards: total students, teachers, today attendance %, pending admissions badge, pending fee amount, at-risk mini-list (top 5).
2. Record a fee payment elsewhere (scenario G), return to dashboard, `snapshot`; verify stat cards refresh (no stale data).

## Scenario B — Students CRUD
1. Open `/admin/students`. `snapshot` row-card list.
2. Search + filter by class/section + paginate. After each filter change: `snapshot`, verify results update and pagination stays sane.
3. View a student detail; check tabs: attendance summary, results (all exams), fees ledger. `snapshot` each tab.
4. Edit a student → change a field → save. `snapshot`; verify inline success banner + change reflects in list.
5. Block a student → confirm modal (radio/confirm) → `snapshot`; verify status BLOCKED (not hard delete), disappears from active rosters.
6. New student → fill create form (uses radios for class/section) → submit. Verify user+student created and appears in roster.

## Scenario C — Teachers + Classes
1. `/admin/teachers`: CRUD + class-subject assignment display. Verify teacher can be assigned to a class+subject (radio/select).
2. `/admin/classes`: manage sections, subjects, teacher assignments. Verify tree class → sections → subjects with teacher names.
3. Edit a class-subject assignment; verify it shows on teacher roster and roster pages.

## Scenario D — Admissions queue (showcase workflow)
1. `/admin/admissions`: review queue SUBMITTED with sidebar count badge. `snapshot`.
2. Open application detail; verify all 4 steps render read-only.
3. Approve → confirm modal → `snapshot`; verify student created, generated credentials shown ONCE, student appears in roster with login.
4. Reject → enter note → `snapshot`; verify status changes, leaves queue.
5. Re-review an already-reviewed app. Verify 409/blocked, not silent duplicate.

## Scenario E — Grades / Exams
1. `/admin/grades`: exams CRUD + publish toggle (radio). `snapshot`; verify publish flips.
2. Cross-check: open second tab as student01; verify student sees results only after publish.
3. Band editor (replace-set): change grade bands, save. Verify validation: contiguous 0–100, no overlaps, descending. Try invalid set (gap/overlap) via radio/select → verify 400 clear message.

## Scenario F — Attendance matrix
1. `/admin/attendance`: pick class/section/date via radios/selects → matrix students × last 10 days. `snapshot`; verify matrix loads, cells show P/A/L.
2. Change date picker; verify matrix updates for that date.

## Scenario G — Fees + payment waterfall
1. `/admin/fees`: fee heads CRUD. `snapshot`; verify create/edit/delete.
2. Generate invoices (head × class/students × due date). Verify invoices appear for right students.
3. Record payment: student picker (radio/select) → outstanding list → amount → **waterfall live preview**. `snapshot` preview; verify oldest-due-first allocation, PAID/PARTIAL splits shown before submit.
4. Submit payment. `snapshot`; verify invoice statuses update (oldest PAID, next PARTIAL).
5. Cross-check: second tab as student01 / parent01; verify fee page reflects the waterfall.
6. Overpay (amount > outstanding). Verify unallocated credit shown, not lost/silent error.

## Scenario H — Notices
1. `/admin/notices`: CRUD + audience select (radio). `snapshot`; verify audience-scoped notice creation.

## Scenario I — At-risk board
1. `/admin/at-risk`: model card (version, trained-at, threshold, metrics). `snapshot`; verify renders.
2. Recompute → info banner while running → `snapshot`; verify board populates sorted by score desc.
3. Table: student, class, score bar, HIGH/MEDIUM/LOW badge, top-3 factor chips. Verify factor chips show direction (`attendance ↓0.31`).
4. Drill into HIGH student; verify student detail confirms the risk story.
5. Empty state before first recompute: verify helpful empty state, not blank table.

## Scenario J — Settings + AI provider panel
1. `/admin/settings`: profile + change-password. Verify password change works; too-short rejected inline.
2. AI provider panel: provider label, base URL, text/vision model, API key (masked, write-only), temperature, enabled toggle (radio). `snapshot`.
3. Change base URL/model (unsaved) → **Test connection**. Verify latency + raw reply shown with unsaved values.
4. Save config. Reload; verify key masked (`sk-…abcd`), raw key never returned.
5. Toggle enabled off → trigger AI route → verify 503/graceful disabled, not crash.
6. Verify 60s-apply note displayed.

## UX + feature checklist (mark each ✓/✗)

- [ ] Stat cards refresh after mutations (snapshot-confirmed, not stale)
- [ ] Pending admissions badge accurate
- [ ] Student create → user+student linked, appears in roster
- [ ] Block = BLOCKED status, not hard delete
- [ ] Teacher class-subject assignment shows on roster
- [ ] Admissions Approve shows generated password ONCE
- [ ] Admissions Re-review → 409, not duplicate
- [ ] Grade-band replace validates 0–100 contiguous/no-overlap (radio-driven)
- [ ] Publish toggle gates student visibility (cross-tab verified)
- [ ] Attendance matrix loads via class/section/date radios
- [ ] Waterfall live preview splits PAID/PARTIAL before submit (snapshot)
- [ ] Overpayment → unallocated credit shown
- [ ] Notice audience select scopes visibility
- [ ] At-risk recompute populates sorted board with factor chips
- [ ] At-risk drill-in confirms risk story
- [ ] At-risk empty state before first recompute
- [ ] API key masked on reload, never raw
- [ ] Test connection works with unsaved values, shows latency+reply
- [ ] Enabled=off → AI routes 503 gracefully
- [ ] Inline status banners on all mutations (no toast)
- [ ] Confirm modal (radio) for destructive actions

## Loop rule
On any flaw, probe 2–3 adjacent scenarios: e.g. after waterfall preview error, try different amount/date via radio selects; after at-chip mismatch, drill into two more flagged students; after band validation failure, try overlapping and gapped sets. Record each with `snapshot`.

## Output
```
# Admin UX Critique — http://localhost:3004/ (admin@guziahs.edu)

## Pane & radio setup
- split pane right 0.45: yes/no ; second tab counterparty: yes/no ; radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page/feature] ... expected vs actual ... severity ... evidence: snapshot/eval ... fix:

## Simulation log
- D3 Approve → generated creds once ... result → adjacent probes ... results
- G3 waterfall preview ... result → adjacent probes ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```

End with `terminal-browser action done`.
