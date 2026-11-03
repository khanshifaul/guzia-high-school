---
id: ai-llm-hardening
title: Harden the LLM provider layer — key truth, timeouts, typed errors, health
status: done
gate: auto
---

## Summary

`apps/api/src/ai/llm/llm.service.ts` now resolves provider precedence, key
presence, timeouts, retries and error mapping in one place. Key presence comes
from `apiKeyEnc` / the env key, never `apiKeyHint`; a keyless public provider
gets a typed 503 before any network call, while loopback/private providers can
run keyless. Calls have 30s/90s hard timeouts with `maxRetries: 0`, a two-attempt
policy limited to 429/5xx/network, and every failure becomes a sanitized Nest
HttpException. `completeJson(opts, schema)` owns the parse → validate → one
repair contract. `GET /api/ai/health` reports the resolved source without
secrets. No provider row, database or production endpoint was touched.

## Before / after

The founder's live measurement (`POST /api/ai/plans/generate`, TEACHER):
HTTP 500 in 1.6s, plans created = 0.

Local reproduction against `main` (`6d98c24`), stubbed OpenAI client, no
network, no DB. The temporary spec asserted the defect and passed:

```
$ bun run test src/ai/llm/before-repro.spec.ts
[Nest] ... ERROR [LlmService] LLM call failed: 401 Incorrect API key provided
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

It proved: the client received `apiKey: 'missing-key'`, `complete()` rejected
with the raw 401 (not a Nest exception), and exactly one attempt was made.

| Check | Before (`6d98c24`) | After |
|---|---|---|
| Live plans generate (founder) | HTTP 500, 1.6s, plans 0 | Not re-run — no production calls |
| Keyless public row, SDK rejects 401 | `apiKey: 'missing-key'` sent; raw 401 escaped as 500 | Client and network never touched; 503 before the call |
| 401/403 with a key | Raw 401 → generic 500 | 503 `provider <name> rejected the key (model <model>)`, 1 attempt |
| Timeout | No timeout, call can hang | 503 `provider <name> timed out after 30s` (90s vision), 1 attempt |
| 429 | Retried on the old table, then raw | 503 after 2 attempts; `Retry-After` honored, default 500ms, cap 30s |
| 5xx / network | Retried once, then raw | 503 after 2 attempts, 300–800ms jitter |
| 400 / other | Raw provider error | 503 `provider <name> returned HTTP <status> (model <model>)` |
| `finish_reason: length` | Invalid JSON surfaced as a caller 400 | 422 `response truncated by max_tokens` before any JSON parse |
| JSON schema mismatch | Caller-side 400 | One repair call; 422 only if the repair also fails |

Status codes by failure class: no key on a public URL → 503; decrypt failure →
503; 401/403 → 503; 429 after one retry → 503; 5xx/network after one retry →
503; 400/other → 503; timeout → 503 (no retry); truncated → 422 (no retry);
failed JSON contract after one repair → 422; nothing configured → 503.

## Precedence chain as implemented

1. An **enabled DB `AiProviderConfig` row always wins** — including a broken
   one. A row named `mock…` is the deterministic offline fixture. A keyless
   public row is a 503; it never falls through.
2. Env-only provider:
   - `AI_PROVIDER=custom` → `AI_BASE_URL` + `AI_MODEL` + `AI_API_KEY`;
   - `AI_PROVIDER=deepseek` → `DEEPSEEK_BASE_URL` + `DEEPSEEK_MODEL` +
     `DEEPSEEK_API_KEY`;
   - `AI_PROVIDER=mock` → mock fixtures.
   A half-configured pair is a 503, not a fallback.
3. `KILO_*` gateway, only when both `KILO_GATEWAY_URL` and `KILO_API_TOKEN`
   are set and nothing above resolved.
4. None → 503.

Keyless local rule: host `localhost`, `127.0.0.1`, `::1`, `10/8`, `172.16/12`,
`192.168/16`, `*.local`, or `AI_ALLOW_KEYLESS_PROVIDER=true`; otherwise a
public host needs a real key. A keyless local provider logs one line at boot.

## Observability

One structured JSON log line per provider call:

```
provider, model, latencyMs, promptTokens, completionTokens, finishReason,
outcome, promptChars
```

`outcome` is one of `ok`, `auth`, `rate_limit`, `server`, `network`, `timeout`,
`truncated`, `request`, `error`. `promptChars` is the system + user + history
length; the key, the prompt body and the base URL are never logged. Token
counts are `null` when the reply has none.

Health response (`GET /api/ai/health`, ADMIN):

```json
{
  "configured": true,
  "source": "db",
  "model": "deepseek-chat",
  "keyPresent": true,
  "lastLatencyMs": 812,
  "lastError": null,
  "checkedAt": "2026-11-03T17:20:00.000Z"
}
```

At runtime, `source` is one of `db`, `env`, `mock`, `none`; there is no secret
or base URL in the payload.

## Files changed

- `apps/api/src/ai/llm/llm.service.ts`
- `apps/api/src/ai/llm/llm.service.spec.ts`
- `apps/api/src/ai/ai.controller.ts`
- `apps/api/src/ai/plans/plans.service.ts`
- `apps/api/src/ai/plans/plans.service.spec.ts`
- `apps/api/src/ai/tests/tests.service.ts`
- `apps/api/src/ai/materials/materials.service.ts`
- `apps/api/src/ai/sources/sources.service.ts`
- `apps/api/src/config/validation.schema.ts`
- `apps/api/.env.example`
- `.agents/results/ai-llm-hardening.md`

## Verify

```
$ bun --filter @guzia/api test
Test Suites: 17 passed, 17 total
Tests:       194 passed, 194 total
Snapshots:   0 total
Time:        12.248 s
Exited with code 0
```

The LLM suite alone, including the new failure-class tests:

```
$ bun run test src/ai/llm/llm.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
```

```
$ bun run lint
$ oxlint apps
exit 0
```

```
$ bun run build            # apps/api
$ nest build
exit 0
```

No e2e suite, database, provider row or production endpoint was used.

## Commit

Code commit: `ebdaf89` (`feat(ai): harden LLM provider resolution, errors and
health`). This result file is a follow-up commit on the same branch.

## Blockers

none

## Reflection

The first attempt at deleting an unused type alias was applied as a duplicate
line instead of a deletion; the build caught it in the next check, one round
trip. The working lesson for this repo: the TypeScript build is the first
check after a structural edit, before the test run. Nothing recurred and no
rule was changed.
