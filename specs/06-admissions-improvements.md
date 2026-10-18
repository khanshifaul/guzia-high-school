# Admissions Improvements — Spec

Adds filtering to the admin review queue, an applicant "my application" view, and admin ability to edit a submitted application before review.

## Problem

1. Admin admissions queue (`/admin/admissions`) has no filters — as volume grows, finding a specific application (by status or class) is manual scanning.
2. Applicants have no way to view their submitted application after the public form — they only see the on-screen receipt (and email). There is no applicant page.
3. Admin cannot edit an application's form data once submitted; corrections require delete + resubmit (delete endpoint does not exist).

## Scope (in/out)

In scope:
- API: `GET /admissions?status=&class=` class filter on queue (ADMIN)
- API: `GET /admissions/me` — return the logged-in applicant's own application (STUDENT, self-scope)
- API: `PATCH /admissions/:id` — admin edit of `formData` only when status is `SUBMITTED` (ADMIN)
- Web admin: filter bar (status + class) on `/admin/admissions`; "Edit" action on a SUBMITTED application opening a sheet/dialog to edit key form fields
- Web applicant: new page `/(portal)/student/admissions` showing the applicant's own application (read-only, with status badge)

Out of scope:
- Public form changes
- Delete application
- Edit after approval/rejection (locked)
- Re-opening a reviewed application

## API contract

### GET /admissions — ADMIN (existing, extended)

Query params:
- `status` — `SUBMITTED | APPROVED | REJECTED` (existing)
- `class` — class name string, e.g. `Class 8` (new). Filters applications whose `formData.classWanted` matches.

Response (existing): `{ data: AdmissionApplication[], meta: { total } }` (already paginated-ish via service; keep shape).

### GET /admissions/me — STUDENT (new)

Returns the current user's own `AdmissionApplication` (by `userId` from JWT, never query string). 404 if none exists.

Response: the application object bare (matches `findOne` shape).

### PATCH /admissions/:id — ADMIN (new)

Body: `{ formData?: Record<string, string> }` — merge-replace of formData fields.
Precondition: status must be `SUBMITTED`; 409 if APPROVED/REJECTED (locked). 404 if missing.
Only `formData` is editable; `status`, `userId`, review fields untouched.

Response: the updated `AdmissionApplication` bare.

## Roles

| Endpoint | Roles |
|---|---|
| GET /admissions | ADMIN |
| GET /admissions/me | STUDENT (self) |
| PATCH /admissions/:id | ADMIN |

## Web

### `/admin/admissions` — admin review queue

Add a filter chip bar above the pending cards:
- Status filter: All / Submitted / Approved / Rejected
- Class filter: All / Class 6 … Class 10 (from `formData.classWanted` distinct values, or fixed list)
Pending cards render within active filters; reviewed list below unchanged.

Add an "Edit" button on each SUBMITTED card opening a sheet with editable fields (student name, guardian name, email, phone, class wanted) → `PATCH /admissions/:id` → refresh queue.

### `/(portal)/student/admissions` — applicant view

- Calls `GET /admissions/me`
- Read-only render of `formData` (grouped: student, guardian, addresses, academic, attachments)
- Status badge + submitted date
- Link back to student dashboard
- Empty state if no application exists

### Nav

Add `Admissions` item to `STUDENT_NAV` (My School section) → `/student/admissions`.

## Validation

- `class` filter value must match `formData.classWanted` exactly (case-sensitive); unknown class returns empty set (no error).
- PATCH body `formData` must be an object; unknown top-level keys allowed (JSON passthrough), but only string values persisted.
- PATCH on non-SUBMITTED → 409 `Already reviewed`.

## Tests

- API: `GET /admissions?class=Class 8` returns only Class 8 applications (unit/service test + controller status).
- API: `GET /admissions/me` returns own application; returns 404 when none; STUDENT cannot read another user's application.
- API: `PATCH /admissions/:id` updates formData on SUBMITTED; 409 on APPROVED/REJECTED; 404 on missing.
