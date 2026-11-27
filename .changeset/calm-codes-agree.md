---
"@digilac/simap-mcp": patch
---

`browse_cpv_tree`: the message for a parent code without subcategories now names the nomenclature (`No CPV subcategories found for code …`), like `browse_bkp_tree`, `browse_npk_tree` and `browse_oag_tree`. The eight nomenclature tools now share one implementation (`src/tools/codes/code-tool-factory.ts`), so their wording can no longer drift apart.
