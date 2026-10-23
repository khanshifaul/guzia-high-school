# Tomorrow — 2026-10-24

Ordered by what unblocks the most. Every row is a queue entry or a named
founder decision.

| # | Item | Owner | Gate |
|---|---|---|---|
| 1 | Land `HANDOFF.md` + this file in one docs PR; the tree is dirty on exactly these two. | next Zolly → foreman → reviewer | auto |
| 2 | Close `product-login-retry` once the tree is clean — merged `c0f6765`, ledger line still open. | next Zolly | auto |
| 3 | Set Render's `WEB_ORIGIN` to the deployed web origin (still `http://localhost:3004`). | founder, dashboard | human |
| 4 | Decide whether `pijunctionbd` and `zylosync` listeners get restarted onto the fixed binary. | founder | human |

Landed: guzia `c0f6765`, kit `581c1c3`, binary rebuilt and listener restarted.
Zero open PRs in both repos. The seat fix is proven live: one reviewer call
exited 0 in 272 s.
