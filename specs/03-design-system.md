# 03 — Design System (from alumni-app)

The portal replicates alumni-app's look byte-for-byte where structural. Full verbatim
reference: `research/alumni-app-design.md` (tokens, every component recipe, shells).
This spec states what to adopt and what to adapt for a school domain.

## Tokens (copy verbatim into `apps/web/app/globals.css`)

- `@import "tailwindcss";` then `:root` / `.dark` HSL variables, then `@theme inline`
  bridge (`--color-*` per token, radius + accordion animations). **No tailwind.config file.**
- Brand: `--primary: hsl(24.6 95% 53.1%)` (≈ #FE5B09 orange). Light-mode `--foreground`
  is orange too — signature look. Dark mode `hsl(24.6 40% 6%)` background.
- Extras to keep: `.bg-gradient-brand` (form-card top strip), layout vars
  (`--sidebar-width: 16rem`, `--header-height: 3.5rem`), sidebar token set.
- Fonts: Geist + Geist_Mono via next/font, but body font stays
  `Arial, Helvetica, sans-serif` (as in alumni-app — do not "fix" this).
- Status token usage: success/warning/info/destructive semantic vars; UI status pills
  use raw Tailwind colors (below).

## Typography law (applies to every page)

| Element | Classes |
|---|---|
| Page H1 | `text-2xl font-black uppercase tracking-tight text-foreground` + icon `text-primary text-xl` |
| Subtitle | `text-muted-foreground text-xs font-semibold mt-1` |
| Field label | `text-[10px] font-black text-muted-foreground uppercase tracking-wider` |
| Buttons/filters | `text-xs font-bold uppercase tracking-wider` |
| Badges/pills | `text-[9px] font-black uppercase tracking-wider` |

## Layout shells

- **Public** (`(public)/`): 3-layer sticky navbar — utility bar `h-8 bg-muted/40`
  (triple date EN/BN + language toggle + theme switch + bell + avatar/login), brand
  block collapsing on scroll (motion height→0 past 30px), uppercase link row with
  spring `layoutId` active indicator. + Footer. Login page = centered card recipe.
- **Portal** (`(portal)/`): alumni-app admin shell with school nav — desktop
  `w-72 bg-card border-r border-border/60 sticky h-screen` sidebar, brand block
  `GHS pill: "GHS ADMIN|TEACHER|STUDENT|PARENT"`, nav items
  `px-4 py-3 rounded-xl font-semibold`, active `bg-primary text-primary-foreground
  shadow-lg shadow-primary/20 scale-[1.02]`, count badges where pending work exists
  (admissions queue). Decorative `bg-primary/5 blur-[100px]` blobs. Mobile: card
  header + spring drawer. Content column with sticky topbar (dynamic page title,
  theme switcher, bell, profile pill with role label).
- **Route gating:** `(portal)/layout.tsx` — `useSession()` from lib/auth-client:
  pending → brand spinner; no session → `/login`; role mismatch → role home. Server
  API re-checks everything (route gate is UX, not security).

## Component kit (`components/ui/`)

Hand-rolled shadcn (forwardRef + `cn()` + cva) — copy from alumni-app and prune:
**keep** button, badge, card, input, textarea, label, select, native-select, checkbox,
switch, table, dialog, alert-dialog, dropdown-menu, popover, tooltip, skeleton,
separator, tabs, avatar, calendar, pagination, scroll-area, empty-state,
theme-switcher, status-banner (inline banner pattern), loading-spinner.
**Drop** (template bloat): map/leaflet, marquee, floating-dock, chatbot, analytics
pixels, carousel, otp-input, command, menubar, resizable, star-rating, file-upload
(MVP has no uploads).

Page-level recipes (all from research file, reuse exact class strings):
- Page header (title + subtitle + right-aligned CTAs)
- Primary CTA / outline CTA micro-type overrides
- Form card: `Card` + `h-1.5 bg-gradient-brand rounded-t-xl` strip + `space-y-5` form
- Filter/search panel (grid, icon-left `pl-9` inputs, dropdown filter triggers)
- Row-card list items (motion fade-up, `border-border/60 rounded-xl`, hover
  `border-primary/20`) — preferred over tables for people lists; tables for marks/fees
- Inline status banners (emerald / destructive tinted) for all mutation feedback —
  **no toast system** (alumni-app pattern)
- Hand-rolled confirm modal (fixed overlay + motion scale) for destructive actions
- EmptyState (dashed border, icon circle) on every list page
- Skeleton (`bg-primary/10 animate-pulse`) during every fetch

## Domain color conventions

Status pills: `bg-<color>-500/10 text-<color>-600 border-<color>-500/20` —

| Domain status | Color |
|---|---|
| present / paid / approved / active / low-risk | emerald |
| late / pending / partial / submitted | amber |
| absent / overdue / rejected / high-risk | rose |
| info (e.g. recompute in progress) | sky |

At-risk badge adds score: `HIGH ≥0.7` rose, `MEDIUM 0.4–0.7` amber, `LOW <0.4` emerald.

## Motion

- List/entrance: `initial={{opacity:0, y:5}} animate={{opacity:1, y:0}}`.
- Drawers/modals: spring `{stiffness:300, damping:30}` + AnimatePresence.
- No GSAP (was homepage-only in alumni-app; our public page is small).

## i18n & theme

- `lib/language-context.tsx`: `{language:'en'|'bn', setLanguage, t(key)}` +
  localStorage; labels via `data-translations.ts` map for domain terms
  (Student/ছাত্র, Attendance/হাজিরি, Result/ফলাফল, Fee/ফি, …). Default `bn`? → **default `en`**
  (reviewers read English; toggle proves bilingual capability).
- next-themes class strategy, `defaultTheme="system"`, ThemeSwitcher icon cycle.
