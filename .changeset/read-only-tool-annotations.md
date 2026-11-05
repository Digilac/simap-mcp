---
"@digilac/simap-mcp": minor
---

All 14 tools now advertise a human-readable `title` and MCP tool annotations (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`) via `registerTool()`. MCP clients can show friendlier tool names and let users auto-approve these read-only calls instead of confirming each one.
