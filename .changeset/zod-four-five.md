---
"@digilac/simap-mcp": patch
---

- `zod` — bump from 4.4.3 to 4.5.4. The 4.5 minor is additive: `z.compile()`, `z.creditCard()`, `z.properties()`, `z.deepPartial()`/`.exactPartial()`, `z.validate()`, new locales, and a large reduction in per-schema memory footprint. Patches 4.5.2–4.5.4 fix `toJSONSchema` numeric record keys, a prototype getter for `vi.spyOn`, and a cycle walk that fired default factories. None of the new APIs are used here and the schemas in this codebase (`z.object`, `z.string`, `z.enum` with `.default()`, `z.array`, `z.lazy`) are unaffected, so tool behavior is unchanged for consumers.
- Direct dev dependencies bumped: `@types/node` 26.2.0 → 26.4.0, `eslint` 10.9.0 → 10.9.1, `typescript-eslint` 8.67.0 → 8.68.0.
