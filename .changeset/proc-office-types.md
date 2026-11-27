---
"@digilac/simap-mcp": patch
---

`search_proc_offices`: fix the tool failing on most searches (#144). simap now returns procurement office types the response schema rejected (`other_cantonal`, `central_federation`, `decentral_federation`, `other_federation`), and one such office made the whole response invalid. The schema now accepts any type, the four new values get labels, and a type simap adds later is shown as-is instead of breaking the tool.
