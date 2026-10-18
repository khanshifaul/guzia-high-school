# UX CRITIC — Teacher
**Target:** `http://localhost:3004/`  |  **Login:** `teacher1@guziahs.edu` / `password123`  |  **Layout:** split pane right 0.45  |  **Plugin:** radio/interaction via `click @<id>`  |  **Focus:** features + UX flaws

## Mission
Critique the teacher portal: dashboard, classes/rosters, attendance marking (P/A/L segmented radios + keyboard fast path), marks entry (grid + CSV paste + inline range errors), assignments (create + grade submissions), notices (class-audience), AI toolkit (plans/tests/sources). Browser in split pane beside conversation. All radio/segmented inputs via `snapshot` → `click @<id>` → `snapshot`. Simulation loops on every flaw. Cross-role: second tab as student01 to verify attendance % and grade reflection.

## Setup (pane layout)
1. `terminal-browser open http://localhost:3004/ --split right --size 0.45`
2. Log in as teacher. Verify redirect to `/teacher`.
3. `snapshot` teacher dashboard: my classes, today's unmarked attendance sections, assignments awaiting grading.
4. `terminal-browser ls`; second tab for student01 cross-session checks.

## Scenario A — Dashboard
1. Verify my classes, today's unmarked attendance sections, assignments awaiting grading.
2. Click an unmarked section → goes to attendance marking for today.

## Scenario B — Classes / rosters
1. `/teacher/classes`: my classes → rosters. Verify only this teacher's classes show.
2. Open a class/section roster. Verify student list with attendance % + latest GPA per student.
3. Click a student → verify sensible detail.

## Scenario C — Attendance marking (core flow, radio-heavy)
1. `/teacher/attendance/mark`: date picker defaults to today (radio/select).
2. Row per student: P/A/L segmented buttons are radio inputs. `snapshot`, locate radio ids, `click @<id>` to mark a mix (some P, some A, some L).
3. Keyboard fast path: arrow keys + enter via `eval` to move focus between students fast. Verify focus moves and statuses record.
4. "Mark all present" shortcut: `click @<id>`; verify all rows set to P in one action.
5. Submit → upsert → success banner. `snapshot`; verify section leaves "today's unmarked" on dashboard.
6. Cross-tab as student01: verify their attendance % updated with weighted formula (P=1, L=0.5).
7. Mark a student not enrolled in the section → server rejects 400; verify UI shows clear error banner.

## Scenario D — Grades / marks entry
1. `/teacher/grades/entry`: exam + subject select (radio) → marks grid (roll, name, input 0..total). `snapshot`.
2. Enter in-range and out-of-range marks. Verify inline red on out-of-range; submit blocked/flagged.
3. CSV paste box: paste `roll,marks` lines → verify prefills grid. `snapshot`.
4. Submit bulk upsert → success banner → verify all-or-nothing (one invalid row → none saved).
5. Cross-tab as student01: verify GPA/CGPA on canonical 4.0 scale, consistent with admin.
6. Publish exam (admin tab) → verify student grades page shows published results only.

## Scenario E — Assignments
1. `/teacher/assignments`: my assignments → create (subject must be one of my class-subjects — radio select, due date).
2. Open assignment → submissions grading table: student, content (expandable), grade input 0..100 + feedback, save.
3. Grade a submission → verify ON_TIME/LATE_GRADED per dueDate; grade feeds student's graded view.
4. Create assignment with subject NOT assigned to this teacher → verify 403/clear error.

## Scenario F — Notices (class-audience)
1. `/teacher/notices`: create class-audience notice (audience radio scoped to teacher's classes). Verify students/parents see it.

## Scenario G — AI toolkit — Plans
1. `/teacher/plans`: cards (class/subject, type, progress bar, status). Verify only this teacher's plans.
2. `/teacher/plans/new`: form-card → generate → spinner → editable week grid (week rows: topic inputs, objective, DONE checkbox/radio). `snapshot`.
3. Generate YEAR/TERM plan → verify editable grid; DONE checkboxes → progress bar updates.
4. Activate plan → status ACTIVE; one ACTIVE per (class,subject,type); activating archives old.
5. Per-week regenerate → verify only that week's topics change; other weeks/edits untouched.
6. "AI-generated — verify" warning shows on every generated plan.

## Scenario H — AI toolkit — Tests
1. `/teacher/tests/new`: blueprint form-card (question mix MCQ/short/long, total marks, duration, difficulty — radios/selects) → generate → grouped editable question list. `snapshot`.
2. Edit/add/delete questions manually → verify answer-key toggle (radio) and print view.
3. Print view → `window.print()` renders clean paper with answer key section.
4. `AI-generated — verify` badge shows on generated papers.
5. Change total marks → verify server rebalances or rejects with clear 502 if sum invalid.

## Scenario I — AI toolkit — Sources
1. `/teacher/sources`: dropzone upload PDF (≤10MB) or image (≤5MB). `snapshot`; verify status pills PROCESSING → READY / NEEDS_OCR / FAILED.
2. Open READY source `/teacher/sources/[id]`: summary card, page-tabbed text, ask box with citation chips, "make test from this" CTA. `snapshot`.
3. Run summarize → verify structured summary renders (EN/BN toggle radio).
4. Ask a question → verify answer + citations `[p.N]` with page chips; "not in document" when out of scope.
5. "Make test from this" → prefills `/tests/new` (2-click upload→test path).
6. Upload image-only PDF → verify NEEDS_OCR surfaced, not silent hang.

## UX + feature checklist (mark each ✓/✗)

- [ ] Dashboard: my classes + unmarked sections + assignments awaiting grading
- [ ] Roster: attendance % + latest GPA per student
- [ ] P/A/L segmented radios respond to `click @<id>`; state verified via snapshot/eval
- [ ] Keyboard arrow+enter fast path moves focus and records statuses
- [ ] "Mark all present" sets all rows in one action
- [ ] Submit → success banner; section leaves unmarked list
- [ ] Student attendance % updates cross-session (weighted formula)
- [ ] Marking non-enrolled student → 400 with clear banner
- [ ] Marks grid inline red on out-of-range; submit blocked/flagged
- [ ] CSV paste prefills grid correctly
- [ ] Bulk marks upsert all-or-nothing
- [ ] GPA/CGPA canonical 4.0 scale, consistent student↔admin
- [ ] Publish gates student visibility
- [ ] Assignment create restricted to teacher's class-subjects (radio)
- [ ] Grading table: grade 0..100 + feedback + save; ON_TIME/LATE_GRADED
- [ ] Class-audience notice scoped to teacher's classes (radio)
- [ ] Plan generate → editable week grid → DONE progress bar
- [ ] Activate archives old plan; one ACTIVE per (class,subject,type)
- [ ] Per-week regenerate doesn't clobber other weeks/edits
- [ ] "AI-generated — verify" warning on plans and tests
- [ ] Test print view clean with answer key
- [ ] Source upload status pills PROCESSING→READY/FAILED/NEEDS_OCR
- [ ] Ask returns answer + page citations; "not in document" when out of scope
- [ ] "Make test from this" prefills tests/new
- [ ] Inline status banners on all mutations (no toast)
- [ ] Confirm modal (radio) for destructive actions

## Loop rule
On any flaw, probe 2–3 adjacent scenarios: e.g. after CSV misparse, try different delimiters/row counts; after plan regenerate issue, regenerate a different week and check teacher edits persist; after ask-citation mismatch, ask 2 more questions on same source. Record each with `snapshot`.

## Output
```
# Teacher UX Critique — http://localhost:3004/ (teacher1@guziahs.edu)

## Pane & radio setup
- split pane right 0.45: yes/no ; second tab student01: yes/no ; P/A/L radios located via snapshot: yes/no

## Critical / High / Medium / Low
- [page/feature] ... expected vs actual ... severity ... evidence: snapshot/eval ... fix:

## Simulation log
- C3 keyboard fast path ... result → adjacent probes ... results
- G5 per-week regenerate ... result → adjacent probes ... results

## Top 3 flaws to fix first
1. ...
2. ...
3. ...
```

End with `terminal-browser action done`.
