---
"@digilac/simap-mcp": patch
---

- `list_cantons`, `list_institutions`, `search_{cpv,bkp,npk,oag}_codes`, `browse_{cpv,bkp,npk,oag}_tree`: responses are now cached in memory for 24 hours. This reference data rarely changes, so repeated lookups return instantly and no longer use up the 60 requests/minute budget that tender searches need. Tender and organization lookups (`search_tenders`, `get_tender_details`, `search_proc_offices`, `get_publication_history`) are not cached. The cache is cleared when the server restarts.
- `SimapClient.get()`: new opt-in `cacheTtlMs` option backed by `ResponseCache` (capped at 500 entries, least recently used evicted first). Concurrent identical requests share one upstream call, and errors are never cached.
