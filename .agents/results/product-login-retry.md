---
id: product-login-retry
title: A 502 on login reads as "can't login" — retry it and say the server is waking
status: done
gate: auto
---

## Summary

`api()` no longer throws a JSON parse error on a non-JSON body: the body is
parsed defensively and an unparseable body becomes a `null` payload. A gateway
error page (502/503/504 with no JSON) now rejects with
"The server is waking up. Please wait a few seconds and try again." instead of
`Unexpected token '<'`. `api()` accepts an opt-in `retryTransient` option that
retries those statuses with a 750 ms then 2 s backoff; `login()` is the only
caller that opts in, because a POST re-send is only safe when the previous
attempt cannot have changed server state — a cold-start 502 never reached the
API, and a successful attempt resolves and stops the retries. Every other
caller, including all writes, keeps the previous one-request behaviour.
`401` JSON bodies are untouched: same detail, still one request.

## Files changed

- `apps/web/lib/api.ts`
- `apps/web/lib/auth-client.ts`
- `apps/web/lib/api.spec.ts` (new)

## Verify

```
$ bun install --frozen-lockfile
1115 packages installed [7.56s]

$ bun run test
@guzia/api test: Test Suites: 16 passed, 16 total
@guzia/api test: Tests:       167 passed, 167 total
@guzia/web test:  Test Files  3 passed (3)
@guzia/web test:       Tests  61 passed (61)

$ cd apps/web && bun run test -- lib/api.spec.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)

$ bunx oxlint apps/web/lib/api.ts apps/web/lib/api.spec.ts apps/web/lib/auth-client.ts
(no output)

$ bunx tsc --noEmit -p apps/web
(no output)
```

Surface check on the running dev server (`bun run dev:web`, port 3004), login
page driven in Chromium with `window.fetch` replaced at runtime:

- `/api/auth/login` answered 502 HTML every time → the page rendered
  "The server is waking up. Please wait a few seconds and try again.", and the
  stub recorded 3 requests (initial + two retries).
- 502, 502, then 200 JSON → the form navigated to the role home `/admin`; the
  auth proxy bounced it back to `/login?callbackUrl=%2Fadmin` because the stub
  set no cookie, which is the expected unauthenticated follow-up.

Not verified: the deployed Render pair (no cold start was triggered).

## Commit

`77d2374` — the work commit (code + spec). This result file is the follow-up
commit on the same branch.

## Blockers

none
