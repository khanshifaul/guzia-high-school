# UX CRITIC — Parent
**Target:** `http://localhost:3004/`  |  **Login:** `parent01@guziahs.edu` / `password123`  |  **Layout:** split pane right 0.45  |  **Plugin:** radio/interaction via `click @<id>`  |  **Focus:** features + UX flaws

## Mission
Critique the parent portal: child selector (multiple children), per-child dashboard mirroring student pages (attendance %, GPA, dues), fees, notices. Browser in split pane beside conversation. Child selector and audience toggles are radio controls: `snapshot` → `click @<id>` → `snapshot`. Simulation loops on every flaw. Critical: probe cross-child data leakage and server-side ownership enforcement (ids from token, never query string).

## Setup (pane layout)
1. `terminal-browser open http://localhost:3004/ --split right --size 0.45`
2. Log in as parent. Verify redirect to `/parent`.
3. `snapshot` parent portal entry: child selector present (multiple children) or direct-to-single-child.
4. `terminal-browser ls`; know parent's linked child(ren) from the seed for scoping verification.

## Scenario A — Child selector (radio-heavy)
1. Multiple children: verify child selector present with sensible default (first child or last-viewed). `snapshot`.
2. Switch between children via selector radios. `snapshot` after each switch; verify every page rescopes to selected child.
3. Single child: verify portal goes directly to that child's scope (no confusing empty selector).

## Scenario B — Per-child dashboard (mirror of student)
1. `/parent` and `/parent/children/[id]`: attendance %, GPA, dues. `snapshot`; verify values match that child's student portal exactly (cross-check by logging in as the child in second tab).
2. Click into attendance/fees/notices for selected child. Verify scoping holds.

## Scenario C — Attendance + GPA
1. Verify attendance % matches child's student calendar heat-view and admin figure.
2. Verify GPA/CGPA shows published exams only; parent must NOT see unpublished grades.
3. Cross-check with admin at-risk / student detail if child flagged.

## Scenario D — Fees
1. `/parent/fees`: outstanding invoices (due date, overdue days badge) + payment history for the child. `snapshot`.
2. Verify overdue days and balances match admin's fee ledger for that child.
3. After admin records a payment (waterfall, admin tab), verify parent page reflects oldest-PAID / next-PARTIAL promptly.

## Scenario E — Notices
1. `/parent/notices`: list for the child. Verify role-filtered, recent, scoped to child's classes/audience.

## Scenario F — Security / ownership enforcement (critical)
1. Try accessing another parent's child by guessing URL `/parent/children/<other-student-id>`. `snapshot`; verify 403/404, not the other child's data.
2. Manipulate query params (`?studentId=...`) to view another child. `snapshot`; verify server enforces linkage from token, never query string.
3. Switch children rapidly. `snapshot`; verify no cross-child data leaks (cached child A data showing while viewing child B).

## UX + feature checklist (mark each ✓/✗)

- [ ] Child selector present when multiple children; sensible default
- [ ] Switching children rescopes every page (snapshot after each radio switch)
- [ ] Single-child parent goes straight to that child (no confusing empty selector)
- [ ] Per-child dashboard: attendance %, GPA, dues match student portal
- [ ] Attendance % matches admin figure
- [ ] GPA/CGPA shows published exams only; unpublished hidden
- [ ] Fees: overdue days badge + balances match admin ledger
- [ ] Parent fee page updates after admin payment (waterfall reflected)
- [ ] Notices role-filtered and scoped to child
- [ ] Accessing another parent's child → 403/404 (no data leakage)
- [ ] Query-string studentId manipulation blocked (server enforces from token)
- [ ] Rapid child-switching → no cross-child stale data
- [ ] Inline status banners on mutations (no toast)
- [ ] Empty states on list pages

## Loop rule
On any flaw, probe 2–3 adjacent scenarios: e.g. after cross-child leak, try two other child IDs; after stale GPA, check the child's sibling; after missing overdue badge, check invoices at due-date boundary. Record each with `snapshot`.

## Output
```
# Parent UX Critique — http://localhost:3004/ (parent01@guziahs.edu)

## Pane & radio setup
- split pane right 0.45: yes/no ; child-selector radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page/feature] ... expected vs actual ... severity ... evidence: snapshot/eval ... fix:

## Simulation log
- F1 another child's URL → ... result → adjacent probes ... results
- D3 payment reflected ... result → adjacent probes ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```

End with `terminal-browser action done`.
