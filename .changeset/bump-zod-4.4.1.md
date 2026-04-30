---
"@digilac/simap-mcp": patch
---

`zod` — bump from 4.3.6 to 4.4.1. The 4.4.0 minor includes correctness fixes around tuple parsing (defaults, optional tails, explicit `undefined`), and 4.4.1 tightens tuple-hole rejection. No tuple schemas in this codebase, so behavior is unchanged for consumers.
