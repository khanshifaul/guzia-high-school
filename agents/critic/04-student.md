# UX CRITIC — Student
**Target:** `http://localhost:3004/`  |  **Login:** `student01@guziahs.edu` / `password123`  |  **Layout:** split pane right 0.45  |  **Plugin:** radio/interaction via `click @<id>`  |  **Focus:** features + UX flaws

## Mission
Critique the student portal: dashboard, attendance calendar heat-view, grades (hidden until published), fees, assignments (submit + resubmit), notices. Browser in split pane beside conversation. Radio/segmented controls (month picker, submit actions) via `snapshot` → `click @<id>` → `snapshot`. Simulation loops on every flaw. Cross-role: second tab as teacher/admin to trigger attendance/marks/fees and verify reflection.

## Setup (pane layout)
1. `terminal-browser open http://localhost:3004/ --split right --size 0.45`
2. Log in as student. Verify redirect to `/student`.
3. `snapshot` student dashboard: stat cards (attendance %, CGPA, pending dues, open assignments, today schedule placeholder, recent notices).
4. `terminal-browser ls`; second tab as teacher/admin to trigger changes.

## Scenario A — Dashboard
1. Verify stat cards: attendance %, CGPA, pending dues, open assignments, today schedule placeholder, recent notices.
2. Trigger changes from second tab (teacher marks attendance; admin records fee payment; teacher publishes marks), then refresh this tab. `snapshot`; verify each card updates — no stale/missing values.
3. Click each card → navigates to corresponding page (attendance, grades, fees, assignments).

## Scenario B — Attendance
1. `/student/attendance`: monthly calendar heat-view (P green / A red / L amber) + weighted % ((P + 0.5·L) / total, 1dp). `snapshot`.
2. Verify heat-view colors match actual attendance records (cross-check with admin matrix tab).
3. Verify weighted % matches admin/student-detail figure exactly.
4. Change months via month-picker radios/selects. `snapshot`; verify heat-view and % recompute for selected month.
5. Empty month (no records): verify sensible empty state, not blank calendar or NaN %.

## Scenario C — Grades / results
1. `/student/grades`: per-exam cards (subject table: marks, total, letter, point), exam GPA, CGPA banner. `snapshot`.
2. **Critical:** before any exam published, verify grades page is HIDDEN entirely (no zeros/empty cards).
3. After publish (admin tab), verify per-exam cards render with correct letter/point per canonical bands (A+ 80–100 … F 0–32).
4. Verify CGPA = mean of published exam GPAs, rounded 2dp, matches admin's computation.
5. Click an exam → report-card view: subject rows + letter/point + exam GPA. `snapshot`.
6. Switch exams. Verify CGPA banner stays consistent.

## Scenario D — Fees
1. `/student/fees`: outstanding invoices (due date, overdue days badge) + payment history. `snapshot`.
2. Verify overdue days = max(0, now − dueDate) for unpaid; badge shows correctly.
3. After admin records a payment (waterfall, admin tab), verify oldest invoice PAID, next PARTIAL, balances update here.
4. Verify payment history lists the admin-recorded payment (amount/method/reference).

## Scenario E — Assignments
1. `/student/assignments`: due list → submit text. `snapshot`.
2. Submit an assignment → verify success, moves to graded view.
3. Try resubmit same assignment → verify 409 banner on resubmit (MVP: no edits).
4. After teacher grades, verify graded view shows grade + feedback.

## Scenario F — Notices
1. `/student/notices`: list. Verify role-filtered, recent.

## UX + feature checklist (mark each ✓/✗)

- [ ] Dashboard stat cards all present and current
- [ ] Cards navigate to their pages
- [ ] Attendance % updates after teacher marks (cross-tab verified)
- [ ] Calendar heat-view colors match records (P green/A red/L amber)
- [ ] Weighted % matches admin exactly, 1dp
- [ ] Month picker radios recompute heat-view + %
- [ ] Empty month → sensible empty state
- [ ] Grades page HIDDEN until any exam published
- [ ] Post-publish: letter/point per canonical bands, exam GPA, CGPA banner
- [ ] CGPA matches admin, 2dp
- [ ] Report-card view: subject rows + letter/point + exam GPA
- [ ] Fees: overdue days badge correct; outstanding invoices listed
- [ ] After admin payment: oldest PAID / next PARTIAL, balances updated
- [ ] Payment history shows admin-recorded payment
- [ ] Assignment submit → success → graded view
- [ ] Resubmit → 409 banner (no silent overwrite)
- [ ] Graded view shows grade + feedback
- [ ] Notices role-filtered and recent
- [ ] Inline status banners on mutations (no toast)
- [ ] Empty states on every list page

## Loop rule
On any flaw, probe 2–3 adjacent scenarios: e.g. after stale CGPA, check two more exams; after missing overdue badge, check invoices due yesterday/today/tomorrow; after 409 resubmit, try back-button and rapid double-submit. Record each with `snapshot`.

## Output
```
# Student UX Critique — http://localhost:3004/ (student01@guziahs.edu)

## Pane & radio setup
- split pane right 0.45: yes/no ; second tab teacher/admin: yes/no ; month-picker radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page/feature] ... expected vs actual ... severity ... evidence: snapshot/eval ... fix:

## Simulation log
- C2 grades hidden before publish ... result → adjacent probes ... results
- D3 payment waterfall reflected ... result → adjacent probes ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```

End with `terminal-browser action done`.
