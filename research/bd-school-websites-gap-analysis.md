# BD School Websites — Gap Analysis

Research: 10 Bangladeshi school/college websites, compared against our landing page
(`apps/web/app/page.tsx`, `components/public/navbar.tsx`, `components/public/footer.tsx`).
Sites analyzed in-depth (homepage read in full): **Notre Dame College Dhaka**
(ndc.edu.bd) and **Cox's Bazar Government College** (cgc.edu.bd). Pattern-sourced from
search snippets: Viqarunnisa Noon School, Rajuk Uttara Model College, Dhaka Residential
Model College, Dhaka College, Dhaka City College, Dhaka Commerce College, Notre Dame
School & College (ndsc.edu.bd), ADMK (admk.edu.bd), Lion Nazrul Islam College.

## 1. Sites table

| # | Site | URL | Notable header feature | Notable footer feature | Standout homepage section |
|---|---|---|---|---|---|
| 1 | Notre Dame College, Dhaka | ndc.edu.bd | Admission-link bar + scrolling notice strip + social row + "Call Us" | Board/footer logo, address (G.P.O. Box, Toyenbee Circular Rd) | Principal message (long-form) + stat counters (94 teachers / 6590 students) + news feed |
| 2 | Cox's Bazar Govt College | cgc.edu.bd | EST. 1962 / EIIN / NU Code strip + live date + Bangla/English + Teacher/Student login | Google Map embed + Facebook plugin + **20 emergency hotlines** (999, 333…) | **Online Services grid** (admission, fee payment, results, receipt, schedules) + notice table with view counts |
| 3 | Notre Dame School & College | ndsc.edu.bd | EIIN + hotline + visitor counter | "Powered by Dcampus" | Student demographics dashboard |
| 4 | Dhaka College | dhakacollege.edu.bd | Bilingual (en) + admission FAQ | Board info | Online admission process detail |
| 5 | Dhaka City College | dhakacitycollege.edu.bd | Established-1957 heritage line | Address + social | Principal + gallery |
| 6 | Dhaka Commerce College | dcc.edu.bd | "College Code / EIIN / NU Code" triple | NU/board links | Notice + news portals |
| 7 | ADMK | admk.edu.bd | **EIIN + Hotline + visitor counters** (today/month/all-time) | "Powered by Dcampus" | Admission CTA |
| 8 | Lion Nazrul Islam College | lnicollege.edu.bd | **Live clock + EIIN** in top bar + Bangla/Student login | Contact + board | Scrolling notice ticker |
| 9 | Bhairab Ideal School | bhairabidealschool.edu.bd | **Live date + EIIN** top bar + Bangla/Student login | Contact + board | Notice ticker (result announcements) |
| 10 | Viqarunnisa / Rajuk / DRMC | (edu.bd) | EIIN + hotline + admission CTA | Board + map | Notice board + results |

## 2. Common header patterns (near-universal)

1. **Top utility bar** (thin, above the logo): EIIN number, hotline/phone, live
   date/clock, Bangla⇄English toggle, social icons. Often `bg-primary`/dark.
2. **Notice marquee / scrolling ticker** — a horizontal auto-scrolling strip of the
   latest notices (very distinctive of BD school sites). Sometimes a PDF-icon list.
3. **Logo block**: school logo + **bilingual name** (English + Bangla) + affiliation
   line (EIIN / NU Code / Board / EST. year).
4. **Main nav** with dropdowns: About, Academics/Admission, Notices, Results, Faculty,
   Gallery, Contact + a distinct **"Online Admission" CTA button** (often red/green).
5. **Login split**: separate "Teacher Login" and "Student Login" buttons (Dcampus
   pattern) — or a single portal link.
6. **Search** box (small, in header or utility bar).

## 3. Common footer patterns

1. 3–4 columns: About/quick links · Contact (full address, phone, email, EIIN) ·
   Important links (board, NU, ministry) · Social/map.
2. **Google Maps embed** of the campus location (cgc.edu.bd) or address block (ndc).
3. **Emergency hotline block** (cgc lists ~20 national numbers: 999, 333, 16263…).
4. **Facebook page plugin** / social feeds.
5. **Board / NU code / EIIN** repeated in footer.
6. **"Developed by / Powered by …"** developer credit line.
7. Copyright + back-to-top.

## 4. Common homepage sections (by frequency)

1. **Notice board** (table: date · title · view-count) — on nearly every site.
2. **Principal's message** with photo (ndc, cgc both feature it prominently).
3. **Online services / admission CTA** grid (admission, fee payment, results, forms).
4. **Photo gallery** (real photos, not placeholder tiles).
5. **Stat counters** (students / teachers / years / buildings).
6. **News / events feed** with dates.
7. **Hero slider** (rotating banner images).
8. **Results lookup** (roll-based result check).
9. **Events calendar**.
10. Vice-Principal message (cgc), alumni, clubs (ndc).

## 5. GAP ANALYSIS — what BD sites have that WE LACK

Our current page: hero · animated stats · why-choose-us · events · programs ·
facilities · testimonials · achievements · gallery (placeholder gradient tiles) · CTA;
navbar = brand + 4 links + theme + Sign In; footer = brand blurb + quick links + contact.

| Gap | Severity | BD evidence | Why it matters |
|---|---|---|---|
| **No EIIN / board / NU code anywhere** | High | cgc "EIIN: 106317 / NU Code: 4401"; dcc; admk | Instant credibility; every BD school site shows it in header+footer |
| **No top utility contact bar** (phone/hotline/date/lang) | High | cgc, lnicollege, admk, ndc | The signature BD header; parents look for the phone number first |
| **No notice marquee / ticker** | High | ndc notice strip; lnicollege/bhairab tickers | Notices are THE reason people visit; a live scrolling bar is expected |
| **No online-admission CTA button** | High | ndc "Admission Link 2026"; cgc "Automated Admission" | Primary conversion action; should be a distinct colored button in header |
| **No teacher/student login split** | Medium | cgc (tp/ + student/); admk; lnicollege | We have one "Sign In"; BD sites split portal logins |
| **No live clock/date + Bangla toggle** | Medium | lnicollege/bhairab live clock; cgc Bangla | Familiar, localized feel |
| **No Principal's message section** | Medium | ndc (long-form); cgc (photo + message) | Trust/authority; a staple |
| **No real notice board (table + view counts)** | High | cgc notice table w/ views; ndc notice list | We only show events, not a proper notice board |
| **No online-services grid** (fee payment, results, receipts, forms) | Medium | cgc "Online Services" | Shows the portal's value on the landing page |
| **Gallery is placeholder gradients, not photos** | Medium | ndc/cgc real photo galleries | Ours looks unfinished; use real/stock school photos |
| **No map embed / full address block in footer** | Medium | cgc Google Maps; ndc address | Locational trust |
| **No emergency hotline block** | Low-Med | cgc (20 numbers) | Distinctive; could add a small "Emergency 999" strip |
| **No board/ministry "Important Links"** | Low-Med | cgc, dcc | Nuance of local convention |
| **No visitor counter / "Powered by"** | Low | admk, ndsc | Nostalgic BD convention; low priority |
| **No vice-principal / faculty teaser** | Low | cgc VP message; ndc faculty link | Depth of content |

## 6. Top 10 concrete improvements (ranked)

1. **Add EIIN + Board + EST. line** to header brand block and footer. (e.g. "EIIN: 123456 · Dhaka Education Board · Est. 1958") — cheapest, highest credibility.
2. **Top utility bar**: hotline phone + email + live date + Bangla⇄English toggle + social icons, above the navbar.
3. **Notice marquee** — a scrolling ticker strip under the navbar pulling the latest 3–5 notices (we already have a notices API + public notices; make a public ticker).
4. **Online Admission CTA button** in the navbar (distinct color, e.g. emerald) + an "Online Services" homepage grid (Admission, Fee Payment, Results, Notices) linking into the portal.
5. **Split portal logins**: "Teacher Login" + "Student/Parent Login" buttons instead of a single "Sign In".
6. **Principal's message** section on the homepage (photo + quote + name/title).
7. **Real notice board** section: table of date · title · views (extend the notices API with a public list + view counter).
8. **Live clock + Bangla toggle** in the utility bar (we have EN/BN strings; add a simple toggle).
9. **Real photo gallery** — replace gradient placeholders with real/stock images (or a proper gallery grid component).
10. **Footer upgrade**: 4 columns + full address + map embed (or address block) + Important Links (Education Board, Ministry) + "Powered by Guzia Portal" credit.

## Note on scope vs the assessment

Items 1–5 (EIIN, utility bar, notice ticker, admission CTA, login split) are the
highest-value, lowest-effort wins and match every BD school site. Items 6–10 add depth.
For the NT Tech assessment demo, the notice ticker + online-services grid + principal
message make the landing page feel like a real BD school site rather than a template.
