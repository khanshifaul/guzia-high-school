# alumni-app — DESIGN Reference (exact replication spec)

Source: `/run/media/khan/Studio/Projects/MyLab/alumni-app`
App: "Guzia High School Alumni Association" (GHSAA) — Next.js 16 App Router, **Tailwind CSS 4 (CSS-first config, NO tailwind.config file)**, shadcn-style hand-rolled UI kit in `components/ui/`, orange brand theme, bilingual EN/BN, light+dark via `next-themes`.

---

## 1. Tech (exact versions from package.json)

| Package | Version | Role |
|---|---|---|
| next | 16.2.6 | Framework (`build` script: `next build --webpack`) |
| react / react-dom | 19.2.4 | UI |
| tailwindcss | ^4 | Utility CSS (CSS-first; configured entirely in `app/globals.css` via `@theme inline`; NO tailwind.config file exists) |
| @tailwindcss/postcss | ^4 | PostCSS plugin (postcss.config.mjs: `{ "@tailwindcss/postcss": {} }`) |
| class-variance-authority | ^0.7.1 | Button/Badge/Toast variant recipes (cva) |
| clsx ^2.1.1 + tailwind-merge ^3.6.0 | → `cn()` in `lib/utils.ts` (`twMerge(clsx(...))`) |
| better-auth | ^1.6.11 | Auth (email+password; Prisma adapter; custom additionalFields: role, status, batch, department, studentId, sscBatch, hscBatch, phoneNumber; `lib/auth.ts` server, `lib/auth-client.ts` react exports `useSession, signIn, signUp, signOut`) |
| @better-auth/prisma-adapter ^1.6.11, prisma / @prisma/client ^7.8.0, @prisma/adapter-pg ^7.8.0, pg ^8.20.0 | DB: Neon PostgreSQL |
| next-themes | ^0.4.6 | Dark mode (`ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`) |
| motion | ^12.38.0 | `motion/react` — micro-animations everywhere (`motion.div`, `AnimatePresence`) |
| gsap + @gsap/react | ^3.15.0 / ^2.1.2 | Homepage scroll reveals (ScrollTrigger inside `gsap.context()`) |
| react-icons | ^5.6.0 | Icons — predominantly **Font Awesome** (`Fa*`) + some Feather (`Fi*`) |
| react-leaflet / leaflet / @types/leaflet | ^5.0.0 / ^1.9.4 | Map (tours page) |
| recharts | ^3.8.1 | Admin analytics charts |
| react-dropzone | ^15.0.0 | CSV/member import |
| @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | ^3.1048.0 | R2/S3 file storage (app/actions/r2.ts) |
| date-fns | ^4.1.0 | Dates |
| dotenv ^17.4.2, tsx ^4.22.1, typescript ^5, eslint ^9 + eslint-config-next 16.2.6, @types/node ^20, @types/react ^19, @types/react-dom ^19 |
| fonts | next/font/google: **Geist** + **Geist_Mono** → CSS vars `--font-geist-sans`, `--font-geist-mono` on `<html>`. NOTE: `body` CSS says `font-family: Arial, Helvetica, sans-serif` — effective body font is Arial; Geist vars mostly unused. |

`next.config.ts` is the empty default. No shadcn CLI (`components.json` absent); UI in `components/ui/` is hand-written shadcn-identical code (`cn()` + forwardRef + cva).

---

## 2. Design Tokens (app/globals.css — copy verbatim)

File header comment: `@srcroot/ui - Orange Theme (Tailwind 4)`. Begins with `@import "tailwindcss";`.

### Light (`:root`) — HSL space-separated
```css
--background: hsl(0 0% 100%);            /* white */
--foreground: hsl(24.6 95% 53.1%);       /* ORANGE brand fg (fg IS orange — signature look) */
--card: hsl(0 0% 100%);        --card-foreground: hsl(24.6 95% 53.1%);
--popover: hsl(0 0% 100%);     --popover-foreground: hsl(24.6 95% 53.1%);
--primary: hsl(24.6 95% 53.1%);          /* ≈ #FE5B09 orange */
--primary-foreground: hsl(355.7 100% 97.3%); /* ≈ #FFF5F6 near-white pink */
--secondary: hsl(24.6 30% 96.1%);        /* tinted grey-cream */
--secondary-foreground: hsl(24.6 95% 53.1%);
--muted: hsl(24.6 30% 96.1%);
--muted-foreground: hsl(24.6 10% 45%);
--accent: hsl(24.6 30% 96.1%);
--accent-foreground: hsl(24.6 95% 53.1%);
--destructive: hsl(0 84.2% 60.2%);  --destructive-foreground: hsl(0 0% 100%);
--success: hsl(142.1 76.2% 36.3%);  --success-foreground: hsl(0 0% 100%);
--warning: hsl(45.4 93.4% 47.5%);   --warning-foreground: hsl(24.6 95% 53.1%);
--info: hsl(201.3 96.3% 32.2%);     --info-foreground: hsl(0 0% 100%);
--border: hsl(24.6 20% 90%);        --input: hsl(24.6 20% 90%);
--ring: hsl(24.6 95% 53.1%);
--radius: 0.5rem;
/* layout vars (used by ui/sidebar primitives) */
--sidebar-width: 16rem; --sidebar-width-mobile: 18rem;
--sidebar-width-collapsed: 3rem; --sidebar-width-icon: 3rem; --header-height: 3.5rem;
/* sidebar tokens */
--sidebar-background: hsl(0 0% 98%); --sidebar-foreground: hsl(24.6 95% 53.1%);
--sidebar-primary: hsl(24.6 95% 53.1%); --sidebar-primary-foreground: hsl(355.7 100% 97.3%);
--sidebar-accent: hsl(24.6 30% 96.1%); --sidebar-accent-foreground: hsl(24.6 95% 53.1%);
--sidebar-border: hsl(24.6 20% 90%); --sidebar-ring: hsl(24.6 95% 53.1%);
```

### Dark (`.dark`)
```css
--background: hsl(24.6 40% 6%);          --foreground: hsl(355.7 100% 97.3%);
--card: hsl(24.6 40% 8%);                --card-foreground: hsl(355.7 100% 97.3%);
--popover: hsl(24.6 40% 8%);             --popover-foreground: hsl(355.7 100% 97.3%);
--primary: hsl(24.6 95% 53.1%);          --primary-foreground: hsl(355.7 100% 97.3%);
--secondary: hsl(24.6 30% 15%);          --secondary-foreground: hsl(355.7 100% 97.3%);
--muted: hsl(24.6 30% 15%);              --muted-foreground: hsl(24.6 20% 65%);
--accent: hsl(24.6 30% 15%);             --accent-foreground: hsl(355.7 100% 97.3%);
--destructive: hsl(0 62.8% 30.6%);       --destructive-foreground: hsl(0 0% 100%);
--success: hsl(142.1 70.6% 45.3%);       --success-foreground: hsl(24.6 95% 53.1%);
--warning: hsl(48 96.5% 53.1%);          --warning-foreground: hsl(24.6 95% 53.1%);
--info: hsl(199.4 95.5% 53.8%);          --info-foreground: hsl(24.6 95% 53.1%);
--border: hsl(24.6 30% 18%);             --input: hsl(24.6 30% 18%);
--ring: hsl(24.6 95% 53.1%);
--sidebar-background: hsl(24.6 40% 10%); --sidebar-foreground: hsl(355.7 100% 97.3%);
--sidebar-primary: hsl(24.6 95% 53.1%);  --sidebar-primary-foreground: hsl(355.7 100% 97.3%);
--sidebar-accent: hsl(24.6 30% 15%);     --sidebar-accent-foreground: hsl(355.7 100% 97.3%);
--sidebar-border: hsl(24.6 30% 18%);     --sidebar-ring: hsl(24.6 95% 53.1%);
```

### `@theme inline` bridge (Tailwind 4)
Maps every var to utilities: `--color-background`, `--color-foreground`, `--color-primary(-foreground)`, `--color-secondary(-foreground)`, `--color-muted(-foreground)`, `--color-accent(-foreground)`, `--color-destructive(-foreground)`, `--color-success(-foreground)`, `--color-warning(-foreground)`, `--color-info(-foreground)`, `--color-card(-foreground)`, `--color-popover(-foreground)`, `--color-border`, `--color-input`, `--color-ring`, all 8 `--color-sidebar-*`. Radii: `--radius-lg: var(--radius)`, `--radius-md: calc(var(--radius) - 2px)`, `--radius-sm: calc(var(--radius) - 4px)`. Accordion: `--animate-accordion-down: accordion-down 0.2s ease-out` (+up) with keyframes using `var(--radix-accordion-content-height)`.

### Extra globals
```css
body { background: var(--background); color: var(--foreground); font-family: Arial, Helvetica, sans-serif; }
.bg-gradient-brand { background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); }
```
`.bg-gradient-brand` is used as a 1.5-height accent strip on top of form cards: `<div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />`.

### Typography conventions (emergent from components/pages)
- Page H1: `text-2xl font-black uppercase tracking-tight text-foreground` + icon `text-primary text-xl`
- Card title: `text-xl font-black uppercase tracking-tight text-foreground` + inline icon
- Section subtitles: `text-muted-foreground text-xs font-semibold mt-1`
- Labels: `text-[10px] font-black text-muted-foreground uppercase tracking-wider`
- Buttons/filters: `text-xs font-bold uppercase tracking-wider`
- Badges/pills: `text-[9px] font-black uppercase tracking-wider`
- Brand lockup: `font-black text-2xl md:text-3.5xl text-primary uppercase tracking-tight`; sub `text-[10px] md:text-xs text-muted-foreground tracking-[0.25em] uppercase mt-1.5 font-semibold`
- Dark mode: `.dark` class + next-themes; components use only semantic tokens so both themes work automatically.

### Spacing/layout conventions
- Page wrapper: `<div className="space-y-6 w-full max-w-full">`
- Public content max width: `container mx-auto px-4 md:px-8 max-w-7xl`
- Cards: `rounded-xl border border-border/60 shadow-sm|shadow-md bg-card`; header `p-6`, content `p-6 pt-0`
- Grids: `grid gap-4`; forms `grid grid-cols-1 sm:grid-cols-2|3 gap-4`
- Borders opacity-modified constantly: `border-border/60`, `border-border/50`, `border-primary/20`

---

## 3. Layout Shell

### Root layout (`app/layout.tsx`)
```jsx
<html className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`} suppressHydrationWarning>
<body className="min-h-full flex flex-col bg-background text-foreground">
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <LanguageProvider>
      <Navbar /> <main className="flex-1 flex flex-col">{children}</main> <Footer />
    </LanguageProvider>
  </ThemeProvider>
</body>
```
Metadata: title "Alumni Association Platform", description "Connecting graduates, fostering relationships, and building a stronger community."

### Public Navbar (`components/navbar.tsx`) — 3 stacked layers
`<nav className="sticky top-0 z-50 w-full bg-background border-b shadow-sm flex flex-col">`; returns `null` on `/admin*`.

- **Layer 1** — utility bar: `w-full bg-muted/40 border-b h-8 flex items-center`; container `max-w-7xl`; left: triple date (Gregorian/Bengali/Hijri via Intl) `text-[11px] font-semibold text-muted-foreground` with `<span className="text-muted-foreground/30">|</span>` separators + language toggle (FaGlobe); right: ThemeSwitcher, `w-px h-3 bg-border` divider, bell DropdownMenu (`w-80`, unread dot `bg-destructive`), avatar DropdownMenu (`w-56`, name+email, Profile/Settings/Logout `text-destructive focus:bg-destructive/10`) or Login·Register `text-[11px] font-semibold`; hamburger `FiMenu/FiX` `md:hidden`.
- **Layer 2** — brand block, **collapses on scroll** (motion height→0 when `scrollY > 30`, duration 0.25): `py-4 md:py-6 container mx-auto px-4 md:px-8 max-w-7xl flex justify-center md:justify-start`.
- **Layer 3** — desktop links (hidden md:flex, h-11): home/directory/events/jobs/mentorship/donate; each `relative py-3.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-primary`, active `text-primary` + `<motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" transition={{ type: "spring", stiffness: 300, damping: 30 }} />`; inactive `text-foreground/80`.
- Mobile drawer: AnimatePresence `fixed top-8 left-0 w-full z-45 max-h-[calc(100vh-2rem)] overflow-y-auto shadow-lg`; items `px-4 py-3 rounded-md text-base font-semibold`, active `bg-primary/10 text-primary`, hover `bg-muted`; h-12 full-width Login/Register buttons.

### Admin Shell (`app/admin/layout.tsx`) — sidebar dashboard
- Client component; `useSession()` gate: pending → full-screen `<FaSpinner className="animate-spin text-4xl text-primary mb-4" />` + pulsing `text-sm font-semibold text-muted-foreground`; no session → `router.replace('/login?callbackUrl=' + pathname)`; role not ADMIN/MODERATOR → `/`.
- Root: `<div className="min-h-screen bg-muted/10 flex flex-col md:flex-row relative">` + 2 decorative blobs: `absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none` (and `bg-orange-500/5` bottom-left).
- **Desktop sidebar**: `<aside className="hidden md:flex flex-col w-72 bg-card border-r border-border/60 shrink-0 sticky top-0 h-screen shadow-xl z-20">`; brand `p-6 border-b border-border/60` (`GHSAA ADMIN` `font-black text-xl text-primary tracking-wider uppercase` + sub `text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-semibold mt-1`); nav `flex-1 overflow-y-auto px-4 py-6 space-y-1.5`; item wrapper `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 relative group cursor-pointer`:
  - active: `bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]`
  - idle: `text-muted-foreground hover:text-foreground hover:bg-muted/80`
  - icon `text-base` (`group-hover:text-primary transition-colors`); badge pill `text-[10px] px-2 py-0.5 rounded-full font-black` (`bg-primary/10 text-primary` idle / `bg-primary-foreground text-primary` active)
  - Links: Overview(/admin), Analytics, Pending Queue(/admin/registrations, count badge), Members, Events, Jobs, Donations, Settings. Footer `p-4 border-t`: "Return to Public Site" `hover:bg-primary/5`.
- **Mobile header**: `md:hidden w-full bg-card border-b border-border/60 flex items-center justify-between px-4 py-4 sticky top-0 z-30 shadow-md` + spring drawer `fixed top-0 bottom-0 left-0 w-80 bg-card border-r border-border/60 z-50 shadow-2xl` with `fixed inset-0 bg-black/40 z-40` backdrop (`initial={{ x: "-100%" }}`, spring 300/30).
- **Content column**: `flex-1 flex flex-col overflow-x-hidden min-h-screen md:h-screen`; desktop topbar `hidden md:flex items-center justify-between px-8 py-5 bg-card border-b border-border/60 shrink-0 sticky top-0 z-10`: dynamic title `text-lg font-bold text-foreground tracking-tight`, language toggle, bell + count pill (`bg-destructive text-[8px] text-white font-black`), ThemeSwitcher, `w-px h-6 bg-border/60`, profile pill (avatar `w-8 h-8 rounded-full border border-primary/20 shadow-sm`, name `text-xs font-bold`, role `text-[9px] font-semibold text-primary uppercase tracking-wider`).

---

## 4. Component Patterns

62 hand-rolled shadcn-style components in `components/ui/` (forwardRef + `cn()` + cva): button, badge, card, input, textarea, label, select, native-select, checkbox, radio, switch, slider, table, dialog, alert-dialog, sheet, drawer, popover, tooltip, dropdown-menu, context-menu, menubar, command, calendar, date-picker, combobox, form-field, input-group, avatar, separator, skeleton, alert, toast, progress, accordion, tabs, toggle, toggle-group, collapsible, resizable, scroll-area, breadcrumb, pagination, carousel, kbd, slot, text, container, aspect-ratio, star-rating, search, button-group, otp-input, image, loading-spinner, file-upload, map, chart, sidebar, theme-switcher, empty-state + marketing floats (whatsapp, marquee, scroll-animation, scroll-to-top, floating-dock, chatbot, table-of-contents) + analytics pixels (ga, gtm, meta-pixel, tiktok-pixel, microsoft-clarity).

### Button (`button.tsx`)
- Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer`
- Variants: default `bg-primary text-primary-foreground shadow hover:bg-primary/90`; destructive `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90`; outline `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`; secondary `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80`; ghost `hover:bg-accent hover:text-accent-foreground`; link `text-primary underline-offset-4 hover:underline`
- Sizes: default `h-9 px-4 py-2`; sm `h-8 rounded-md px-3 text-xs`; lg `h-10 rounded-md px-8`; icon `h-9 w-9`; `asChild` via local `components/ui/slot.tsx`.
- **Page-level overrides (the actual look)**: primary CTA `font-black text-xs uppercase tracking-wider px-4 py-2.5 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform duration-200`; toolbar btn `font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-none bg-transparent`; form submit `flex-1 gap-2 font-black text-xs uppercase tracking-wider h-11`.

### Card (`card.tsx`)
`rounded-xl border bg-card text-card-foreground shadow` (pages pass `border-border/60 shadow-sm|shadow-md|shadow-xl`); Header `flex flex-col space-y-1.5 p-6` (pages add `border-b pb-4`); Title `font-semibold leading-none tracking-tight`; Description `text-sm text-muted-foreground`; Content `p-6 pt-0`; Footer `flex items-center p-6 pt-0`.
**Form-card recipe**: Card + `<div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />` + icon+`text-xl font-black uppercase tracking-tight` title + `space-y-5` form.

### Table (`table.tsx`)
Wrapper `relative w-full overflow-auto` (has `containerClassName` prop); table `w-full caption-bottom text-sm`; thead `[&_tr]:border-b`; tbody `[&_tr:last-child]:border-0`; tr `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`; th `h-10 px-2 text-left align-middle font-medium text-muted-foreground`; td `p-2 align-middle`; footer `border-t bg-muted/50 font-medium`; caption `mt-4 text-sm text-muted-foreground`.
NOTE: admin list pages usually prefer **row-cards** over tables (see recipes).

### Input (`input.tsx`) — enhanced
Base: `flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`. Custom props: `error` → `border-destructive focus-visible:ring-destructive`; `type="password"` auto show/hide (FiEye/FiEyeOff, `pr-9`); `type="search"` auto icon `pl-9` + clear X. Pages add icon wrapper: `absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground` + `className="pl-9"`; form inputs often `h-11`.

### Badge (`badge.tsx`) cva
Base `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`; variants default/secondary/destructive/outline (standard shadcn). Page recipe: `bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5`; role colors Admin `bg-rose-500/10 text-rose-600 border-rose-500/20`, Moderator `bg-violet-500/10 text-violet-600 border-violet-500/20`, neutral `bg-muted text-muted-foreground border-border`. **General status idiom: `bg-<color>-500/10 text-<color>-600 border-<color>-500/20`** (emerald for success/active).

### EmptyState (`empty-state.tsx`)
`flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/5`; icon circle `h-20 w-20 rounded-full bg-muted/50` w/ `h-10 w-10 text-muted-foreground`; title `text-lg font-semibold tracking-tight`; desc `text-muted-foreground text-sm max-w-sm mt-2 mb-6`; optional action. List-page inline variant: `py-12 text-center border border-dashed rounded-xl bg-muted/10` + `font-bold text-sm text-muted-foreground` line.

### Skeleton (`skeleton.tsx`): `animate-pulse rounded-md bg-primary/10` (brand-tinted, not grey).

### LoadingSpinner (`loading-spinner.tsx`): svg cva `animate-spin` (size/variant) + `LoadingOverlay`; admin gate uses `<FaSpinner className="animate-spin text-4xl text-primary" />` + `animate-pulse` text.

### FormField (`form-field.tsx`): label/description/error wrapper (Label + children). Most pages hand-roll: `<div className="space-y-1.5"><label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">…</label><Input className="h-11" …/></div>`. Selects in forms are native: `<select className="w-full text-xs font-semibold h-11 px-3 border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary">`.

### Confirmation modals — hand-rolled (`app/admin/donations/page.tsx` lines 565-643)
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
    className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
    <h3 className="text-lg font-black uppercase tracking-tight text-foreground flex items-center gap-2">
      <FaIcon className="text-destructive" size={16} /> Title</h3>
    <p className="text-xs text-muted-foreground leading-relaxed font-semibold">Body copy…</p>
    <div className="flex justify-end gap-3 pt-2">
      <Button variant="outline" className="text-xs font-bold uppercase tracking-wider h-10 px-4">Cancel</Button>
      <Button variant="destructive" className="text-xs font-bold uppercase tracking-wider h-10 px-4">Yes, Do It</Button>
```
(ui/dialog IS used on `/mentorship` with DialogHeader/Title/Footer; ui/alert-dialog exists but unused in app pages.)

### Toast / feedback
- `components/ui/toast.tsx` exists (Toast/Title/Description/Action; cva default|destructive; `role=alert|status`) but **no provider/useToast wired; zero `toast()` calls in app/**.
- Actual feedback = **inline status banner** (`app/admin/registrations/AdminRegistrationsList.tsx` 88-103): success `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`, error `bg-destructive/10 text-destructive border-destructive/20`, wrapper `p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border` + motion fade-down.
- Form error banner (login): AnimatePresence `p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2.5` + `FaExclamationTriangle`.

### Motion conventions
- Entrance: `initial={{ opacity: 0, y: 5|20 }} animate={{ opacity: 1, y: 0 }}` per list item.
- Drawers/accordions: `{ type: "spring", stiffness: 300, damping: 30 }` + AnimatePresence height auto.
- Homepage GSAP: `gsap.fromTo(el, {opacity:0,y:30}, {opacity:1,y:0,duration:1.2,ease:"power3.out", scrollTrigger:{trigger, start:"top 85%", toggleActions:"play none none reverse"}})` inside `gsap.context()`.

---

## 5. Route Map (app/)

**Public** (root shell: Navbar + Footer):
- `/` — homepage: hero, upcoming events (Carousel), success stories, stats, FAQ accordion, GSAP scroll reveals
- `/register` — multi-section signup; `/login` — centered Card login
- `/directory` — alumni search grid; `/directory/me` — own profile; `/directory/[id]` — profile detail
- `/events` — list; `/events/create` — propose; `/events/[id]` — detail; `/events/[id]/checkout` — registration payment
- `/payment/sslcommerz` — SSLCommerz payment page
- `/jobs` — job board; `/jobs/create` — post job
- `/mentorship` — matchmaking (search + Dialog request form + Select filters + Textarea)
- `/memories` — memory feed; `/donate` & `/giving` — donation campaigns; `/tours` — Leaflet map
- `/faq`, `/interviews`, `/career`, `/pages`, `/privacy`, `/terms`, `/cookies` — content pages
- `/settings` — user settings
- `/api/auth/[...all]` — better-auth API handler

**Admin** (admin sidebar shell, session+role gated):
- `/admin` — overview; `/admin/analytics` — recharts
- `/admin/registrations` — approval queue (+ `[id]` detail `RegistrationDetailConsole.tsx`; list `AdminRegistrationsList.tsx`)
- `/admin/members` — member CRUD (+ `/import` CSV upload, `/create`, `/[id]/edit`)
- `/admin/events` — moderation (+ `/create`, `/[id]/edit`, `/rsvps` ledger `AdminRSVPLedgerClient.tsx`)
- `/admin/jobs` — moderation (+ `/create`, `/[id]/edit`)
- `/admin/donations` — ledger w/ approve/refund confirmation modals
- `/admin/settings`

**Server actions** `app/actions/`: `admin.ts` (assertAdmin-gated CRUD: getAdminMembers, updateAdminMemberRole, toggleSuspendAdminMember, createAdminMember…), `events.ts`, `jobs.ts`, `donations.ts`, `mentorship.ts`, `memories.ts`, `directory.ts`, `r2.ts`. Pattern: `"use server"` → session assert → Prisma query → `revalidatePath`.

---

## 6. Auth & State Patterns

- **better-auth** (`lib/auth.ts`): prismaAdapter postgresql; `emailAndPassword: { enabled: true, requireEmailVerification: false }`; user additionalFields: role (string, default "ALUMNI"), status (default "PENDING"), batch, department, studentId, sscBatch, hscBatch, phoneNumber. Client (`lib/auth-client.ts`): `createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", plugins: [inferAdditionalFields<typeof auth>()] })`; exports `{ useSession, signIn, signUp, signOut }`. Catch-all route `app/api/auth/[...all]/route.ts`.
- **Login** (`app/login/page.tsx`): `flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12` → motion fade-up Card `max-w-md border-border/50 shadow-xl`; medallion `mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4` + `FaGraduationCap text-3xl text-primary`; icon-left inputs `pl-10`; submit `w-full h-11` disabled+label-swap while loading; on success role redirect `window.location.href = ADMIN|MODERATOR ? "/admin" : "/directory"`.
- **Protection**: admin layout client-side session gate + role check (redirect `/login?callbackUrl=…` / `/`); server actions re-assert via `assertAdmin()`; public Navbar returns null on `/admin*`.
- **State**: no React Query/SWR/Zustand. All pages `"use client"`, `useState` + `useEffect` calling server actions directly; mutations re-fetch locally; server side `revalidatePath`.
- **i18n**: `lib/LanguageContext.tsx` — context `{ language: "en"|"bn", setLanguage, t(key), currency… }`, big dictionary, localStorage persistence; strings via `t("key")` or `language === "en" ? … : …`.
- **Theme**: next-themes class strategy; `components/ui/theme-switcher.tsx` icon button cycling light→dark→system (FiSun/FiMoon/FiMonitor, mounted-guard).

---

## 7. Copy-worthy recipes (exact class strings)

**Page header**
```jsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
  <div>
    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
      <FaIcon className="text-primary text-xl" /> Page Title
    </h1>
    <p className="text-muted-foreground text-xs font-semibold mt-1">Subtitle copy…</p>
  </div>
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">…CTAs…</div>
</div>
```

**Primary CTA**: `w-full sm:w-auto gap-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider px-4 py-2.5 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform duration-200`
**Outline CTA**: `variant="outline"` + `w-full sm:w-auto gap-2 font-black text-xs uppercase tracking-wider px-4 py-2.5 border-border hover:bg-muted`

**Filter/search panel**
```jsx
<Card className="border-border/60 shadow-sm w-full">
  <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
    <div className="relative md:col-span-2">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"><FaSearch size={12}/></div>
      <Input className="pl-9" … />
```
Dropdown filter trigger: `Button variant="outline" className="w-full justify-between font-bold text-xs uppercase tracking-wider"` + `<FaChevronDown size={10} className="text-muted-foreground ml-1"/>`; content `w-40`.

**Row-card list item**
```jsx
<motion.div key={id} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
 className="bg-card border border-border/60 rounded-xl p-5 hover:border-primary/20 transition-all duration-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
```
Avatar `w-12 h-12 rounded-full border bg-muted object-cover` + status dot `absolute bottom-0 right-0 p-0.5 bg-emerald-500|bg-destructive rounded-full border border-card text-white flex items-center justify-center`.

**Auth center**: `flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12` + `motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}} className="w-full max-w-md"`.

**Status banner**: `p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border` + success `bg-emerald-500/10 text-emerald-500 border-emerald-500/20` | error `bg-destructive/10 text-destructive border-destructive/20`.

**Destructive hover btn**: `text-destructive hover:bg-destructive/10 border-destructive/20`; positive: `text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20`.

**Vertical divider**: `w-px h-5|6 bg-border|border-border/60`. **Dot**: `w-1 h-1 rounded-full bg-border`.

**Avatar fallback (demo data)**: `https://avatar.shifaul.dev/username?username=<name>&size=128&shape=circle&theme=sunset` (deterministic generated avatars).

---

## 8. Design DNA summary (for guzia-high-school)
1. **Single orange hue (#FE5B09 ≈ hsl(24.6 95% 53.1%))**; neutrals orange-tinted; light-mode foreground itself orange.
2. **Micro-typography**: actionable/label text always `uppercase` + `tracking-wider|widest` + `font-bold|black` at `text-[10px]`–`text-xs`.
3. **Tinted status pills**: `bg-<color>-500/10 text-<color>-600 border-<color>-500/20` (emerald=success).
4. **Cards**: `rounded-xl` + `border-border/60` + `shadow-sm` + optional 1.5px `.bg-gradient-brand` top strip on forms.
5. **Admin = w-72 sidebar shell** (primary pill nav w/ scale-up active state, blur-blob background, session-gated spinner); **public = 3-layer sticky navbar** (utility bar h-8 / collapsible brand / uppercase link row w/ spring indicator).
6. **Feedback = inline banners** (no wired toast system); **modals = hand-rolled** fixed overlay + motion scale; entrances everywhere via motion/react; GSAP reserved for homepage scroll reveals.
7. **Architecture to mirror**: Tailwind-4 CSS-first tokens, hand-rolled shadcn ui/ kit, better-auth + Prisma/Postgres server actions with assertAdmin + revalidatePath, client pages fetching actions in useEffect, context i18n + next-themes.
