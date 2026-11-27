---
"@digilac/simap-mcp": patch
---

`search_bkp_codes`, `search_npk_codes`, `search_oag_codes`: list the codes that match the search. simap returns the matches nested under their parent categories, and these three tools dropped everything below the top level, so searching BKP for "Beton" returned "1 - Vorbereitungsarbeiten" and never "211.5 - Beton- und Stahlbetonarbeiten". All code endpoints now share one response schema (`CodeTreeResponseSchema`) that keeps the children, as `search_cpv_codes` already did.
