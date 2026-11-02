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

The branch was rebased onto `origin/main` at `a20fcb6` (PR #34, hero slider); the five conflicts were resolved keeping both the Page/Block CMS and main's newer hero-slider, service-card and CTA work.

## Conflict resolution

- `apps/web/app/page.tsx` — hand-merged. `HeroSlider`, the headmaster message,
  the events strip, the gradient CTA and the compact quick-access cards are
  main's; the stats, highlights, programs, facilities, testimonials,
  achievements, gallery and services sections come from the blocks, with
  main's layouts where main had redesigned them. Services link through
  `/portal/<key>` again (main's version linked `/login` for signed-in users and
  showed the raw key as the label).
- `apps/api/src/app.module.ts` — union: `HeroSlidesModule` (main) **and**
  `PagesModule` (this branch). Main had the pages files but never registered the
  module, so `/api/pages/:slug` did not exist on main.
- `apps/web/components/portal/role-nav.ts` — main's version, which already
  carries both the Hero Slider and Pages entries.
- `apps/api/prisma/generated/internal/class.ts` and
  `prismaNamespace.ts` — main's copies, then `prisma generate` from the merged
  schema; the regenerated client is byte-identical to what the branch commits
  (no hand-merged generated code).
- `apps/api/prisma/schema.prisma` — the union was already main's file
  (`Page`, `Block`, `HeroSlide`); no edit needed.

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

After the rebase, the diff against `origin/main` is four files —
`.agents/results/site-admin-cms.md`, `apps/api/src/app.module.ts`,
`apps/web/app/page.tsx` and `apps/web/lib/page-blocks.spec.ts`. The rest of the
list above is already on `main`: PR #34 merged the CMS source. What this branch
adds on top is the module registration main omitted (`PagesModule` was present as
files but never imported, so `/api/pages/:slug` was not served), the block-driven
homepage main had replaced with literals, and the EN/BN join test.

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

Re-run after the rebase, from the worktree root.

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

$ bun run lint
(no output)
exit=0

$ (cd apps/api && bunx tsc --noEmit -p tsconfig.json)
(no output)
exit=0

$ (cd apps/web && bunx tsc --noEmit)
(no output)
exit=0

$ (cd apps/api && bunx prisma generate)
Generated Prisma Client (7.10.1) to ./prisma/generated
$ git status --short apps/api/prisma/generated
(no output — the committed client already matches Page + Block + HeroSlide)

$ (cd apps/api && bunx prisma migrate status)
22 migrations found in prisma/migrations
Database schema is up to date!
```

Runtime check on the merged page (API :4000, web :3004, managed Chromium):

- `GET /api/pages/home` → 200, 8 blocks in admin order; `GET /api/hero-slides`
  → 200.
- With one temporary published slide, the homepage rendered its title and
  subtitle and dropped the static fallback; deleting the slide restored the
  fallback. The CMS sections rendered in both cases — the slider and the blocks
  coexist. The slide was created and removed only for this check.
- Home in English and Bengali: stats, highlights, programs (with the
  `Grades 6–10` footnote), facilities, testimonials, achievements, gallery,
  services, both footer link lists and the hotline strip all render from the
  database (`কেন গুজিয়া …`, `দ্রুত লিংক`, `জাতীয় জরুরি সেবা`).
- Services cards show the block's titles and descriptions and link
  `/portal/{admission,attendance,grades,fees}`.
- `/about` (mission/vision/values, achievements), `/academics` (programs with
  subject badges, “How We Teach”) and `/pages` (seven sitemap entries) render.
- Browser console: no errors on any page.

The one migration main had left unapplied on the connected dev database
(`20261026193825_add_hero_slider`) was applied through `prisma migrate deploy`
so the merged page could be exercised; it is additive and already on `main`.

## Commit

`8909993` (`feat(pages): admin-editable bilingual public content`) is the
post-rebase feature commit on `foreman/site-gov-compliance`. The result update
that carries this text is the follow-up commit on the same branch, which cannot
name its own SHA.

## Blockers

None technical. PR #33 is open, rebased onto `origin/main` and awaiting review.
This task did not merge it, close it, re-open it, or touch `main`.

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
