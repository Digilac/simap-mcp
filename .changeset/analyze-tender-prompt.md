---
"@digilac/simap-mcp": minor
---

`analyze_tender`: new MCP prompt that takes a simap.ch tender link and guides the model through a structured bid/no-bid analysis (scope, key dates, eligibility, award criteria, submission requirements, risks). Users only paste the link from their browser; the project ID and language are read from it, and a project number or title also works (the model then finds the project with `search_tenders`).
