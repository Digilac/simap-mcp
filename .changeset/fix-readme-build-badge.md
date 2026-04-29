---
"@digilac/simap-mcp": patch
---

`README.md` — fix the broken "GitHub Actions Workflow Status" badge: it pointed at the deleted `publish.yml` (replaced by `release.yml` in the changesets migration). Now points at `ci.yml` on `main`, which is the more accurate signal of project health.
