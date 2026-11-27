---
"@digilac/simap-mcp": patch
---

`browse_cpv_tree`, `browse_bkp_tree`, `browse_npk_tree`, `browse_oag_tree`: mark the categories that have subcategories with 📂. simap flags them with `hasChildren`, which the tools ignored, so the marker never appeared and nothing told the model which categories it could open.
