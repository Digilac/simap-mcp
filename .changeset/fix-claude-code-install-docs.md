---
"@digilac/simap-mcp": patch
---

- `README.md` — rework the installation section for non-technical users. Claude Desktop is now the recommended path with a numbered walkthrough (including the "fully quit and reopen" step and a check that the tools loaded), and the Node.js prerequisite is scoped to the clients that actually need it — Claude Desktop bundles its own runtime.
- `README.md` — fix the Claude Code setup instructions. They pointed at `~/.claude/settings.json`, which Claude Code does not read `mcpServers` from, so the server never appeared. `claude mcp add simap -- npx -y @digilac/simap-mcp` is now the documented path, with `.mcp.json` as the manual alternative.
- `README.md` — add LM Studio, drop the Cline and Zed sections, and collapse Claude Code / Cursor / VS Code / Windsurf into a single table since they all take the same snippet.
