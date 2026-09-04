---
"@digilac/simap-mcp": minor
---

- `src/server.ts` — migrate from the raw `@modelcontextprotocol/sdk` to [FastMCP for TypeScript](https://github.com/PrefectHQ/fastmcp-ts) (`@prefecthq/fastmcp-ts`), which now owns server construction, tool registration, and the stdio transport. Same 14 tools, same parameters, same Markdown output, still stdio-only.
- `registerTool()` (`src/utils/register-tool.ts`) — new shared wrapper every tool goes through. It advertises the `inputSchema` in Zod _input_ mode so fields with a default (`lang`, `fullRaw`) stay optional (FastMCP's auto-generated schema would have listed them as `required`), and it validates arguments itself so invalid input comes back as an `isError` tool result listing each field (`- projectId: Invalid UUID`) instead of a bare JSON-RPC `-32602` error without field paths.
- `search_proc_offices` — the "provide `search` or `institutionId`" check returns a `ToolResult` (`isError: true`) again rather than throwing.
- `startServer()` — forces `transport: "stdio"` and overrides FastMCP's `MCP_TRANSPORT` env override (with a stderr warning), so a stray variable in the host environment cannot start an unauthenticated HTTP listener. Documented in `SECURITY.md`.
- Startup now logs FastMCP's own banner (`[fastmcp] INFO starting simap vX.Y.Z (stdio)`) to stderr instead of `simap MCP Server running on stdio`.
- Wire-level differences visible to clients: `inputSchema` is now JSON Schema draft 2020-12 (was draft-07), unknown tool names return a JSON-RPC `-32602` error (was an `isError` result), and the server additionally advertises empty `resources`/`prompts`/`logging`/`completions` capabilities.
