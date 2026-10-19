# Deployment

Target stack: **Vercel** (web) · **Render** (API, Docker) · **Neon** (Postgres) ·
**Backblaze B2** (uploads).

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | API image with poppler + tesseract for OCR |
| `.dockerignore` | keeps the web app and local state out of the image |
| `render.yaml` | Render Blueprint (service, health check, env names) |
| `neon.ts` | Neon policy: Postgres only (auth/functions/storage stay in the app) |
| `apps/web/next.config.*` | `/api/*` rewritten to `API_BASE_URL` (same-origin) |

## Why the web talks to `/api`, not to Render directly

`apps/web/lib/api.ts` calls `fetch("/api…")` and Next rewrites that to the API.
The browser therefore only ever sees the Vercel origin, so the `ghs_token`
cookie (`SameSite=Lax`) is sent normally. Calling the API cross-origin would
drop the cookie and every request would return 401.

For the same reason, **do not set `NEXT_PUBLIC_API_URL` on Vercel** — leaving it
unset makes the studio uploads use `/api/…` too (the proxy).

## 1. Neon (already provisioned)

Project `crimson-pine-39200986`, branch `production`
(`br-polished-sound-b4nwd7ts`). `neon env pull` wrote both URLs:

| Variable | Uses |
|---|---|
| `DATABASE_URL` | pooled (PgBouncer) — the **runtime** connection |
| `DATABASE_URL_UNPOOLED` | direct — **migrations only** |

The schema is already migrated and seeded from this machine. New environments
must run `prisma migrate deploy` against the **unpooled** URL.

## 2. Backblaze B2 (uploads)

1. Create/keep a bucket (`STORAGE_BUCKET`, e.g. `guziahigh`).
2. Create an application key with read/write on that bucket.
3. Values for Render:

```
STORAGE_ENDPOINT=https://s3.<region>.backblazeb2.com
STORAGE_REGION=<region>
STORAGE_BUCKET=<bucket>
STORAGE_ACCESS_KEY_ID=<key id>
STORAGE_SECRET_ACCESS_KEY=<application key>
STORAGE_FORCE_PATH_STYLE=false
```

Without these the API writes to `uploads/` **inside the container**, which is
discarded on every deploy.

## 3. Render (API)

1. **New → Blueprint**, select the repository (it reads `render.yaml`), or
   **New → Web Service → Docker** with
   `Dockerfile path: apps/api/Dockerfile`, `Docker context: .`,
   `Health check path: /health`.
2. Fill the secrets marked `sync: false`:

```
DATABASE_URL=<Neon pooled URL>
DATABASE_URL_UNPOOLED=<Neon direct URL>
WEB_ORIGIN=https://<your-app>.vercel.app
JWT_SECRET=<long random>
AI_CONFIG_SECRET=<long random>   # never change after the first boot
AI_PROVIDER=mock                 # all AI works offline; set KILO_* for real answers
STORAGE_*=<from step 2>
```

`PORT` is injected by Render. Do not set it.

3. After the first deploy, open the Render **Shell** and run once:

```bash
DATABASE_URL="$DATABASE_URL_UNPOOLED" bunx prisma migrate deploy
bun run db:seed
bun run ai:train
```

4. Verify: `https://<api>.onrender.com/health` → `{"ok":true,"database":"up"}`,
   and `/api/docs` for Swagger.

## 4. Vercel (web)

1. **Add New → Project**, import the repository.
2. Root Directory: `apps/web`
   Install Command: `cd ../.. && bun install`
   Build Command: `bun run build`
   Framework Preset: Next.js.
3. Environment variable (Production + Preview):

```
API_BASE_URL=https://<api>.onrender.com
```

Do **not** set `NEXT_PUBLIC_API_URL`.

4. Deploy, open the URL, sign in with `admin@guziahs.edu / password123`.

## Known limits of the free tier

- **Render free sleeps after 15 minutes.** The first request afterwards takes
  ~50 s and can time out mid-demo; warm it with
  `curl https://<api>.onrender.com/health`.
- **Uploads through the Vercel proxy.** The rewrite forwards the body to Render;
  a ~40 MB PDF may be rejected. If so, either upload smaller files or point the
  three `NEXT_PUBLIC_API_URL` usages at the API and switch the cookie to
  `SameSite=None; Secure` (cross-site; Chrome may block it).
- **First embedding run downloads the model.** `EMBEDDINGS_PROVIDER=local`
  fetches `paraphrase-multilingual-MiniLM-L12-v2` (~450 MB) into the container
  cache on first use.
- **Neon free** suspends after ~5 minutes idle (~500 ms on the next query).
- OCR needs poppler + tesseract, installed by the Dockerfile; a host without
  them keeps the `NEEDS_OCR` fallback.
