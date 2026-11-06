# Tomorrow — 2026-11-05

Ordered by what unblocks the most. Every row is a queue entry or a named
founder decision. Measured at the 2026-11-04 close: `main` `3499505`, 240 tests
green, nothing in flight.

| # | Item | Owner | Gate |
|---|---|---|---|
| 1 | Land `HANDOFF.md` and `tomorrow_schedule.md` through the reviewer — the tree is dirty on exactly these two (`.agents/queue/` is gitignored by design). | next Zolly → foreman → reviewer | auto |
| 2 | Redeploy the API on Render so #36–#40 are actually running. Same dashboard visit: set `WEB_ORIGIN` to the deployed web origin and paste a real DeepSeek key into the AI provider settings — without the key every generation returns "provider rejected the key". | founder | human |
| 3 | Rule on `db-migration-replay-repair`: migrations do not replay from empty, so fresh environments and `migrate dev` fail. Rewriting applied history needs your call. | founder | human |
| 4 | After the deploy, verify the shipped work live: `GET /api/ai/health` reports the provider state, and a paper exports as DOCX and PDF with Times New Roman + Kalpurush and zero Bijoy glyphs. | next Zolly | auto |
| 5 | Decide whether the 117 legacy Bijoy papers get a Unicode importer. The decoder reads them but misorders reph (`নির্বাচনী` → `নিবার্চনী`), so the importer needs a corrected mapping first. | founder | human |
| 6 | Pick the next defect from `OPEN-QUESTIONS.md` — 12 remain after Q-0004/Q-0005 landed. Work the money and numbers ones first. | next Zolly → foreman | auto |
| 7 | Housekeeping: six stale `origin/foreman/*` refs whose content is already on `main`. | next Zolly | auto |

Not on this list, deliberately: the export and RAG work is done and merged;
re-running it would be motion, not progress.
