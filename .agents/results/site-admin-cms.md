---
id: site-admin-cms
title: Every public word, number and image comes from the database and is admin-editable
status: done
gate: auto
---

## Summary

The public site's section content is now a `Page` + ordered `Block` model with
migrations, a public read (`GET /pages/:slug`), an admin list and editor, and an
idempotent seed that carries the content out of the React files.

- **Models** — `Page` (slug, title EN/BN, published) and `Block` (page, key, kind,
  order, bodyEn, bodyBn, imageUrl, linkUrl, published), with `@@unique([pageId, key])`
  and an index on `(pageId, sortOrder)`. Migration `20261027120000_public_pages`,
  applied to the connected database (the project's Neon dev branch).
- **Public read** — `GET /api/pages/:slug` returns the page's published blocks,
  both languages, in `sortOrder`. A missing or unpublished page is 404.
- **Admin write** — `GET/PATCH /api/admin/pages[/:slug]`, `POST/PATCH/DELETE
  …/:slug/blocks[/:blockId]`, `POST …/:slug/blocks/reorder`, all `@Roles('ADMIN')`.
  Anonymous callers get 401. Bodies are validated as JSON objects; keys are
  unique per page; reorder must list every block exactly once.
- **Web** — `lib/page-blocks.ts` is the single contract (`bodyEn` is authoritative
  for structure and for non-text fields; `bodyBn` supplies text positionally;
  `bodyFor()` is the only join). `/admin/pages` lists pages; `/admin/pages/:slug`
  edits page title EN/BN + publish, and each block with EN and বাংলা inputs side
  by side, add/remove/reorder rows, reorder blocks, publish/unpublish, and image
  upload through the existing `/upload` service.
- **Migrated** — home's `highlights`, `programs`, `facilities`, `testimonials`,
  `achievements`, `stats`, `gallery`; about's mission/vision/values and
  achievements; academics' programs and facilities; the Online Services titles and
  descriptions; the footer's two link lists; the `/pages` sitemap labels; and the
  emergency-hotline list. The literals are deleted, not duplicated: the grep in
  the brief prints nothing, and `lib/online-services.ts` now carries only
  keys/routes (no title, description or icon).

**Scope boundary, stated rather than implied.** The brief's acceptance list is
what was migrated. Still in code, untouched: the three page heroes, the acting
headmaster's message, the events section (`lib/public-content.ts`), the about
history paragraphs, and the privacy/terms prose on `/pages`. The history and
hero copy read the admin-editable `SiteSetting` singleton where they interpolate
the school name and established year. If the founder wants those as blocks too,
they are additions to the same model — `page-blocks.ts` only needs a kind.

### How a fresh database gets the content

`PagesService` seeds any page or block whose key is missing on first read, then
never writes again — the same pattern `SiteSettingsService.get()` already uses
for its singleton, and the reason the public site cannot start empty. The seed is
guarded by one in-flight promise per process and tolerates a concurrent insert
(`P2002` is ignored). A test proves it does not overwrite a row an admin edited
and backfills only the missing key.

## Files changed

- `apps/api/prisma/schema.prisma` — `Page`, `Block`.
- `apps/api/prisma/migrations/20261027120000_public_pages/migration.sql` — new.
- `apps/api/prisma/generated/**` — regenerated Prisma client (tracked in this
  repo; includes the two new models).
- `apps/api/src/pages/pages.service.ts` — public read, admin CRUD, reorder, seed.
- `apps/api/src/pages/pages.controller.ts` — public `GET /pages/:slug`.
- `apps/api/src/pages/admin-pages.controller.ts` — admin routes.
- `apps/api/src/pages/pages.module.ts`, `apps/api/src/pages/dto/**` — new.
- `apps/api/src/pages/page-seed.ts` — the shipped bilingual content.
- `apps/api/src/pages/pages.service.spec.ts` — new, 12 tests.
- `apps/api/src/app.module.ts` — registers `PagesModule`.
- `apps/web/lib/page-blocks.ts` — block contract, field specs, EN/BN join.
- `apps/web/lib/pages.ts` — page fetch + `usePage` + `blockOf`.
- `apps/web/lib/icon-registry.ts` — the icon names a block may store.
- `apps/web/components/public/page-unavailable.tsx` — whole-page empty state.
- `apps/web/app/page.tsx` — home renders blocks only.
- `apps/web/app/about/page.tsx` — values + achievements from blocks.
- `apps/web/app/academics/page.tsx` — programs + facilities from blocks.
- `apps/web/app/pages/page.tsx` — sitemap labels from the `global` page.
- `apps/web/components/public/footer.tsx` — both link lists from the `global` page.
- `apps/web/components/public/emergency-hotlines.tsx` — hotline rows from a block.
- `apps/web/lib/online-services.ts` — titles/descriptions removed (now content).
- `apps/web/app/(portal)/admin/pages/page.tsx` — pages list.
- `apps/web/app/(portal)/admin/pages/[slug]/page.tsx` — block editor.
- `apps/web/components/portal/role-nav.ts` — “Pages” item under System.
- `apps/web/lib/page-blocks.spec.ts` — new, 11 tests.
- `.agents/results/site-admin-cms.md` — this file.

## Proof of control

One block — home `highlights` — changed in the admin and read back publicly, then
restored. API pair (admin cookie obtained with the seeded demo admin):

```
$ python3 …  # login, then PATCH /api/admin/pages/home/blocks/<highlights-id>
anonymous GET /admin/pages -> 401
admin login -> 200
admin GET /admin/pages -> 200 [('about', 2), ('academics', 2), ('global', 4), ('home', 8)]

BEFORE (public) EN: Why Choose Guzia Bilateral High School?
BEFORE (public) BN: কেন গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়?

PATCH block -> 200
AFTER  (public) EN: PROOF OF CONTROL · edited in admin

RESTORE -> 200 | public title: Why Choose Guzia Bilateral High School?
```

Same pair through the browser, driving the admin UI (managed Chromium, not the
founder's session), then the public page:

```
editor inputs, in order: "Home", "হোম",
  "Why Choose Guzia Bilateral High School?", "কেন গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়?",
  "We are committed to providing quality education …", "আমরা আগামীর চ্যালেঞ্জ …"
wrote new title: true
clicked save: true
feedback: Saved “highlights”
public page shows the admin text: true
restored title: true
public restored: true
```

The editor therefore shows the same string the visitor reads, in both columns,
and the public page reads from the response rather than a literal.

Unpublishing:

```
after unpublished: ['achievements','facilities','gallery','programs','services','stats','testimonials']
after republished: ['achievements','facilities','gallery','highlights','programs','services','stats','testimonials']

about page unpublished -> empty state rendered: true | stale achievements gone: true
about achievements block unpublished -> values still shown: true | achievements hidden: true
both restored through the API afterwards
```

The database was left as shipped: `no proof text: True`, and `/pages/about`
returns `['values', 'achievements']`.

## Verify

```
$ grep -nE 'const (highlights|programs|facilities|testimonials|achievements|stats|gallery) *=' \
    apps/web/app/page.tsx apps/web/app/about/page.tsx apps/web/app/academics/page.tsx
(no output)
exit=1

$ bun install --frozen-lockfile && bun run test
@guzia/api test: Test Suites: 17 passed, 17 total
@guzia/api test: Tests:       179 passed, 179 total
@guzia/web test:  Test Files  4 passed (4)
@guzia/web test:       Tests  72 passed (72)

$ (cd apps/web && bunx tsc --noEmit)
(no output)
$ (cd apps/api && bunx tsc --noEmit -p tsconfig.json)
(no output)

$ bun run lint
(only the two pre-existing warnings in apps/api/prisma/seed.ts: unused sectionsA/sectionsB)

$ (cd apps/api && bunx prisma migrate status)
no pending migration after deploy
```

Runtime checks against the running API and web app:

- `GET /api/pages/home` → 8 blocks; `highlights` EN/BN title correct, 6 rows in
  both documents; stats carry `compute: "years-since-established"` for the
  years-of-excellence row.
- `GET /api/pages/{about,academics,global}` → 2, 2 and 4 blocks in admin order.
- Home page in both languages: all eight sections and both footer columns render
  the DB text (`কেন গুজিয়া …`, `দ্রুত লিংক`, `জাতীয় জরুরি সেবা`).
- `/about`: mission/vision/values, achievements, history. `/academics`:
  programs with subject badges, “How We Teach”. `/pages`: the seven sitemap
  entries with their original labels and hrefs.
- `next dev` was run and the page's console reported no errors.

## Commit

`feat(pages): admin-editable bilingual public content` on
`foreman/site-gov-compliance`. This file cannot name its own SHA; the follow-up
commit on the same branch records it.

## Blockers

None technical. **No pull request was opened:** this repository is public and
`rules/safety.md` treats a pull-request description as publishing, which needs
the founder to name it. The branch is committed and pushed; the reviewer's PR
step is the one remaining action outside this task's authority. The migration is
already applied to the connected dev database.

## Reflection

Two things to record. First, the admin editor was delegated and came back with a
truncated import and an undefined type — it did not compile. I rewrote it rather
than patch around it; the lesson is that the delegated slice was too large to
verify by reading its claim, and `tsc` was the check that caught it. Second, the
seed keeps a copy of the shipped content in `page-seed.ts` by design (a fresh
database must render), and the service never overwrites a row. The risk to watch
is a future edit to that file after both languages have diverged: changing an
already-seeded block there changes nothing at runtime. If that becomes confusing,
the seed content should move to `prisma/seed.ts` only, with the first-read
backfill kept for block keys alone.
