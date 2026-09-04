# simap MCP Server

[![GitHub License](https://img.shields.io/github/license/Digilac/simap-mcp)](./LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40digilac%2Fsimap-mcp)](https://www.npmjs.com/package/@digilac/simap-mcp)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Digilac/simap-mcp/ci.yml?branch=main)](https://github.com/Digilac/simap-mcp/actions/workflows/ci.yml)
![NPM Downloads](https://img.shields.io/npm/dw/%40digilac%2Fsimap-mcp)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Digilac/simap-mcp)

An [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server for interacting with [simap.ch](https://www.simap.ch/), Switzerland's public procurement platform.

Enables Claude and other AI assistants to search and view public tenders in Switzerland.

Developed by [Digilac](https://www.digilac.ch/).

## Features

| Tool | Description |
|------|-------------|
| `search_tenders` | Search tenders with filters (text, dates, types, cantons, CPV) |
| `get_tender_details` | Get full details of a specific tender |
| `search_cpv_codes` | Search CPV codes (Common Procurement Vocabulary) |
| `browse_cpv_tree` | Navigate CPV code hierarchy |
| `list_cantons` | List all Swiss cantons |
| `list_institutions` | List Swiss public institutions |
| `get_publication_history` | Get publication history for a project |
| `search_proc_offices` | Search public procurement offices |
| `search_bkp_codes` | Search BKP codes (construction) |
| `browse_bkp_tree` | Navigate BKP code hierarchy |
| `search_npk_codes` | Search NPK codes (standardized positions) |
| `browse_npk_tree` | Navigate NPK code hierarchy |
| `search_oag_codes` | Search OAG codes (object types) |
| `browse_oag_tree` | Navigate OAG code hierarchy |

## Prerequisites

- An MCP-compatible client — **[Claude Desktop](#claude-desktop-recommended) is the easiest** if you are not a developer.
- **Node.js ≥ 22** — *only* for clients that do not bundle it. Claude Desktop ships with its own Node.js, so there is nothing to install. For every other client, get it from [nodejs.org](https://nodejs.org/) (pick the LTS version).
- No simap account, no API key, no payment — the simap API is public and read-only.

## Installation & Configuration

### Claude Desktop (recommended)

1. In Claude Desktop, open **Settings → Developer → Edit Config**. This opens the folder holding `claude_desktop_config.json`:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
2. Open that file in a text editor and paste the block below. If the file already contains an `mcpServers` section, add only the `"simap"` entry inside it.

   ```json
   {
     "mcpServers": {
       "simap": {
         "command": "npx",
         "args": ["-y", "@digilac/simap-mcp"]
       }
     }
   }
   ```

3. Save the file, then **fully quit** Claude Desktop (macOS: ⌘Q — closing the window is not enough) and reopen it.
4. Check it worked: the simap tools now show up under the tools icon in the message box. Ask *"List the Swiss cantons in simap"* — Claude should answer with the 26 cantons.

The very first launch downloads the server, which takes a few seconds. If the tools do not appear, check **Settings → Developer** for the server status and logs.

### LM Studio

LM Studio follows the same `mcp.json` notation. Open the **Program** tab in the right-hand sidebar, then **Install → Edit mcp.json**, and add:

```json
{
  "mcpServers": {
    "simap": {
      "command": "npx",
      "args": ["-y", "@digilac/simap-mcp"]
    }
  }
}
```

> LM Studio does not bundle Node.js — install it from [nodejs.org](https://nodejs.org/) first. Tender search leans on the model's ability to chain tool calls, so results depend a lot on which local model you load.

### Code editors & developer tools

<details>
<summary><b>Claude Code, Cursor, VS Code, Windsurf</b></summary>

They all take the same snippet — only the file and the top-level key change:

| Client | Where | Top-level key |
| ------ | ----- | ------------- |
| **Claude Code** | `claude mcp add simap -- npx -y @digilac/simap-mcp` | `mcpServers` |
| **Cursor** | `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project) | `mcpServers` |
| **VS Code** (Copilot) | `.vscode/mcp.json`, or the **MCP: Open User Configuration** command | `servers` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |

```json
{
  "mcpServers": {
    "simap": {
      "command": "npx",
      "args": ["-y", "@digilac/simap-mcp"]
    }
  }
}
```

- **Claude Code** — add `--scope user` to enable it in every project, or `--scope project` to write a `.mcp.json` shared with your team. Claude Code does **not** read `mcpServers` from `settings.json`. Verify with `claude mcp list`.
- **VS Code** uses `servers` as the top-level key, not `mcpServers`.
- **Cursor** loads MCP servers only at startup — quit and reopen it fully.

</details>

<details>
<summary><b>Alternative: global install</b></summary>

```bash
npm install -g @digilac/simap-mcp
```

Then point your client at the command directly:

```json
{
  "mcpServers": {
    "simap": {
      "command": "simap-mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Alternative: from source</b></summary>

```bash
git clone https://github.com/Digilac/simap-mcp.git
cd simap-mcp
npm install
npm run build
```

Then point your client at the absolute path:

```json
{
  "mcpServers": {
    "simap": {
      "command": "node",
      "args": ["/absolute/path/to/simap-mcp/dist/index.js"]
    }
  }
}
```

</details>

## Usage

Once configured, just ask your AI assistant in natural language. Mention "in simap" to make sure the assistant routes the request through the MCP server:

- *"Show me new tenders published today in simap"*
- *"Find construction tenders in canton Vaud in simap"*
- *"Give me the details of this tender in simap"* (after a search)
- *"Search CPV codes for IT services in simap"*

## Listed on

* [Official MCP Registry](https://registry.modelcontextprotocol.io/?q=io.github.Digilac%2Fsimap-mcp)
* [Awesome MCP Servers](https://mcpservers.org/servers/digilac/simap-mcp)
* [LobeHub](https://lobehub.com/mcp/digilac-simap-mcp)
* [MCP.so](https://mcp.so/server/simap-mcp-server/Digilac)
* [MCP Market](https://mcpmarket.com/server/simap)
* [MCP Marketplace](https://mcp-marketplace.io/server/io-github-digilac-simap-mcp)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and commands, and [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture, internal patterns, and the full tool parameter reference.

## simap API

This server uses the public API from [simap.ch](https://www.simap.ch/api-doc/).

## License

[MIT](./LICENSE)
