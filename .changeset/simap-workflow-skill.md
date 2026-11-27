---
"@digilac/simap-mcp": minor
---

- `simap-workflow` Skill: the server now publishes a Skill through the MCP Skills extension (`skill://simap-workflow/SKILL.md`). It tells the agent how to chain the tools: pick CPV/BKP codes, cantons and the buyer, run `search_tenders` (including its today-only default), open results with `get_tender_details`, check `get_publication_history`, then write the bid/no-bid analysis. Clients without the extension can read the same text as a plain resource.
- `analyze_tender`: its analysis sections and rules now come from constants shared with the Skill, so the two always ask for the same analysis. The prompt text is unchanged.
