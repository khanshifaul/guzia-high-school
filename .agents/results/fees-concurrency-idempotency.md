---
id: fees-concurrency-idempotency
title: Fee payments allocate under a lock; invoice generation is idempotent per head and due date
status: done
gate: auto
---

## Summary

Closes OPEN-QUESTIONS Q-0004 and Q-0005 in `apps/api/src/fees` per the founder's
2026-11-02 choice (option a for both). `recordPayment` now locks the student's
invoice rows with `SELECT … FOR UPDATE` inside the transaction, recomputes
outstanding from the locked snapshot, re-checks the amount, and retries the
whole transaction at most 3 times on deadlock/serialization failures.
`Invoice` gained `@@unique([studentId, feeHeadId, dueDate])`, so invoice
generation inserts with `skipDuplicates` and returns `{ created, skipped }`.
A new e2e spec (`apps/api/test/fees.e2e-spec.ts`) proves both invariants against
the compose Postgres.

## Before the fix

Measured on branch head `4197294` (before any change), API on
`postgresql://ghs:ghs_dev_password@localhost:5434/ghs`, fixtures class
`e2e-fees-1793612322914` / fee head 1200 / one invoice.

**Q-0004 replay — two concurrent ৳1200 payments, one ৳1200 invoice.** Both
succeeded:

```json
[
  { "status": 201, "body": { "paymentId": "cmvz2gtty000ga2rrrwqswc8k",
      "allocated": [{ "invoiceId": "cmvz2gttj000fa2rrsbrx7xzo", "amount": 1200 }],
      "statuses": [{ "invoiceId": "cmvz2gttj000fa2rrsbrx7xzo", "status": "PAID" }] } },
  { "status": 201, "body": { "paymentId": "cmvz2gtty000ha2rr61nqiqs7",
      "allocated": [{ "invoiceId": "cmvz2gttj000fa2rrsbrx7xzo", "amount": 1200 }],
      "statuses": [{ "invoiceId": "cmvz2gttj000fa2rrsbrx7xzo", "status": "PAID" }] } }
]
```

SQL sum of allocations for that invoice — 2400 on a 1200 invoice:

```
            id             | amount | status | allocated
---------------------------+--------+--------+-----------
 cmvz2gttj000fa2rrsbrx7xzo |   1200 | PAID   |      2400
```

**Q-0005 replay — same fee head and due date generated twice.** Both calls
reported the full batch created:

```json
{ "generate1":           { "status": 201, "body": { "created": 1, "amount": 1200 } },
  "generate2_sameDue":   { "status": 201, "body": { "created": 1, "amount": 1200 } },
  "generate3_newDue":    { "status": 201, "body": { "created": 1, "amount": 1200 } } }
```

SQL count per due date — the same due date produced 2 invoices:

```
       dueDate       | invoices
---------------------+----------
 2026-12-01 00:00:00 |        2
 2026-12-15 00:00:00 |        1
```

Only these fixtures were removed afterwards (class `e2e-fees-1793612322914`,
its one student, its fee head, 3 invoices, 2 payments, 2 allocations); the
cleanup deleted `2, 2, 0, 3, 1, 1, 1, 1` rows in that order.

## After the fix

Measured on `9d092ec` with the migration applied, same compose DB, fixtures
class `e2e-fees-1793612512926` (same shapes, amounts 1200).

**Q-0004 replay — one 201 and one 400:**

```json
[
  { "status": 201, "body": { "paymentId": "cmvz2kwg5000aamrr2fbhqjfx",
      "allocated": [{ "invoiceId": "cmvz2kwfp0009amrr3jlnta6j", "amount": 1200 }],
      "statuses": [{ "invoiceId": "cmvz2kwfp0009amrr3jlnta6j", "status": "PAID" }] } },
  { "status": 400, "body": { "success": false, "statusCode": 400,
      "message": "Validation failed",
      "errors": "Payment 1200 exceeds outstanding balance 0" } }
]
```

SQL — 1200 allocated, status `PAID`, one payment row:

```
            id             | amount | status | allocated
---------------------------+--------+--------+-----------
 cmvz2kwfp0009amrr3jlnta6j |   1200 | PAID   |      1200

       dueDate       | invoices
---------------------+----------
 2026-12-01 00:00:00 |        1
 2026-12-15 00:00:00 |        1

 payments
----------
        1
```

**Q-0005 replay — second call creates nothing, new due date creates:**

```json
{ "generate1":         { "status": 201, "body": { "created": 1, "skipped": 0, "amount": 1200 } },
  "generate2_sameDue": { "status": 201, "body": { "created": 0, "skipped": 1, "amount": 1200 } },
  "generate3_newDue":  { "status": 201, "body": { "created": 1, "skipped": 0, "amount": 1200 } } }
```

The 2026-12-01 count stayed at 1; the new 2026-12-15 installment added the
second row shown above. An oversized payment still returns 400
(`"Payment 999999 exceeds outstanding balance 1200"`). The fixtures for this
run were removed the same way; a residue check afterwards returned `0, 0, 0, 0`
for `E2E-FEES-*` classes, heads, students and invoices.

## Migration

- Name: `20261102000000_fees_invoice_unique_per_head_due`
- SQL: `CREATE UNIQUE INDEX "Invoice_studentId_feeHeadId_dueDate_key" ON "Invoice"("studentId", "feeHeadId", "dueDate");`
- Duplicate pre-check on the migration target, run before applying:

```
 studentId | feeHeadId | dueDate | n | ids
-----------+-----------+---------+---+-----
(0 rows)
```

The migration was applied to `localhost:5434/ghs` and recorded with
`prisma migrate resolve --applied`. `prisma migrate dev` cannot build a shadow
database on this branch: the pre-existing migration
`20261026193825_add_hero_slider` fails on replay with `relation "HeroSlide"
does not exist`, so the migration SQL was taken from
`prisma migrate diff --from-config-datasource --to-schema` (whose only other
statements are the already-pending Page/Block/HeroSlide tables and one
`ExamSubject` index, all left untouched). The compose database is 3 migrations
behind `main` for the same pre-existing reason; that is not part of this task.

## Files changed

- `apps/api/src/fees/fees.service.ts`
- `apps/api/src/fees/fees.controller.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261102000000_fees_invoice_unique_per_head_due/migration.sql`
- `apps/api/test/fees.e2e-spec.ts`
- `apps/web/app/(portal)/admin/fees/page.tsx`
- `OPEN-QUESTIONS.md`

## Verify

```
$ bun --filter @guzia/api test
Test Suites: 17 passed, 17 total
Tests:       179 passed, 179 total
Snapshots:   0 total
Time:        12.343 s
Ran all test suites.
Exited with code 0
```

```
$ DATABASE_URL=postgresql://ghs:ghs_dev_password@localhost:5434/ghs bun --filter @guzia/api test:e2e
Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        3.604 s
Ran all test suites.
Exited with code 0
```

(The API was started for this run with
`DATABASE_URL=postgresql://ghs:ghs_dev_password@localhost:5434/ghs bun --filter @guzia/api dev`
and answered `/health` with 200.)

```
$ bun run lint
$ oxlint apps
(no findings)
exit 0
```

Additional checks run: the fees e2e file repeated 5 times — `Tests: 3 passed,
3 total` each time; `bunx tsc --noEmit -p apps/api/tsconfig.json` exit 0;
`bunx tsc --noEmit -p apps/web/tsconfig.json` exit 0; `bun --filter @guzia/web
test` → `Test Files 4 passed (4)`, `Tests 72 passed (72)`.

## Commit

`9d092ec` — `fix(fees): lock payment allocation and make invoice generation idempotent`.
This result file is committed on the same branch after that SHA.

## Blockers

None.

## Reflection

The first shadow-database attempt failed on a migration that predates this
task, and I spent one round working out that the failure was not caused by the
new index. The lesson recorded for the next agent: on this repository, verify a
hand-applied migration by diffing the live database against the schema and
recording it with `migrate resolve --applied` rather than expecting
`migrate dev` to replay the history; the broken history is known and out of
scope. Nothing else recurred.
