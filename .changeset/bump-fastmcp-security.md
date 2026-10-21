---
"@digilac/simap-mcp": patch
---

- `@prefecthq/fastmcp-ts`: bump to `^1.8.1` so installs resolve `@modelcontextprotocol/server` / `server-legacy` `>=2.3.1` and `hono` `>=4.13.11`, clearing the GHSA-jm63-cq47-j5jp, GHSA-46jr-4wx8-v453, GHSA-rvq5-wwqv-78pq and GHSA-5r4p-p66f-jhc7 advisories (HTTP-transport only; this server runs on stdio, so not exploitable here, but `npm audit` flagged them).
