---
"@digilac/simap-mcp": patch
---

`zod` — bump from 4.4.1 to 4.4.3. 4.4.2 tightens `z.discriminatedUnion` option typing and makes `z.preprocess` defer optionality to the inner schema; 4.4.3 restores `.catch()` and `preprocess` handling for absent object keys. None of these APIs are used in this codebase, so behavior is unchanged for consumers.
