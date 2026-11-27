---
"@digilac/simap-mcp": patch
---

`browse_oag_tree`: accept the dotted codes simap uses below the first level (`1.2`, `1.10`, `4.4.2`). The `parentCode` parameter only allowed digits, so nothing under a top-level OAG category could be opened.
