# SIMAP MCP Server

[![GitHub License](https://img.shields.io/github/license/Digilac/simap-mcp)](./LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40digilac%2Fsimap-mcp)](https://www.npmjs.com/package/@digilac/simap-mcp)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Digilac/simap-mcp/publish.yml)](https://github.com/Digilac/simap-mcp/actions/workflows/publish.yml)
![NPM Downloads](https://img.shields.io/npm/dw/%40digilac%2Fsimap-mcp)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Digilac/simap-mcp)

An [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server for interacting with [SIMAP.ch](https://simap.ch), Switzerland's public procurement platform.

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

- **Node.js ≥ 20** (LTS or newer).
- An MCP-compatible client (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline, Zed, …).
- No SIMAP account or API key required — the SIMAP API is public and read-only.

## Installation & Configuration

The recommended way is `npx` — no global install needed. Pick your client below and copy the snippet.

<details>
<summary><b>Claude Code (CLI)</b></summary>

Add to `~/.claude/settings.json`:

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

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Edit the Claude Desktop configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop for the change to take effect.

</details>

<details>
<summary><b>Cursor</b></summary>

Global config at `~/.cursor/mcp.json` (all projects) or project-level `.cursor/mcp.json`:

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

Fully quit and reopen Cursor — MCP servers are only loaded at startup.

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

Workspace config at `.vscode/mcp.json` (or open the user-level file via the **MCP: Open User Configuration** command):

```json
{
  "servers": {
    "simap": {
      "command": "npx",
      "args": ["-y", "@digilac/simap-mcp"]
    }
  }
}
```

> VS Code uses `servers` as the top-level key (not `mcpServers`).

</details>

<details>
<summary><b>Windsurf</b></summary>

Edit `~/.codeium/windsurf/mcp_config.json`:

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

</details>

<details>
<summary><b>Cline (VS Code extension)</b></summary>

Open Cline's **MCP Servers** panel → **Configure** tab, then paste:

```json
{
  "mcpServers": {
    "simap": {
      "command": "npx",
      "args": ["-y", "@digilac/simap-mcp"],
      "disabled": false
    }
  }
}
```

</details>

<details>
<summary><b>Zed</b></summary>

Edit the user `settings.json` (`~/.config/zed/settings.json` on macOS/Linux, `%APPDATA%\Zed\settings.json` on Windows) or a project-level `.zed/settings.json`:

```json
{
  "context_servers": {
    "simap": {
      "command": "npx",
      "args": ["-y", "@digilac/simap-mcp"]
    }
  }
}
```

> Zed uses `context_servers` as the top-level key.

</details>

<details>
<summary><b>Alternative: Global install</b></summary>

```bash
npm install -g @digilac/simap-mcp
```

Then configure your client with the direct command:

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
<summary><b>Alternative: From source</b></summary>

```bash
git clone https://github.com/Digilac/simap-mcp.git
cd simap-mcp
npm install
npm run build
```

Then configure your client with the absolute path:

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

Once configured, just ask your AI assistant in natural language. Mention **"in SIMAP"** so the assistant actually routes the request through the MCP server instead of answering from general knowledge:

- *"Show me new tenders published today **in SIMAP**"*
- *"Find construction tenders in canton Vaud **in SIMAP**"*
- *"Give me the details of this tender **in SIMAP**"* (after a search)
- *"Search CPV codes for IT services **in SIMAP**"*

## Reference

<details>
<summary><code>search_tenders</code> — Search public tenders</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search text (min 3 characters) |
| `publicationFrom` | date | Start date (YYYY-MM-DD) |
| `publicationUntil` | date | End date (YYYY-MM-DD) |
| `projectSubTypes` | array | Project types (see below) |
| `cantons` | array | Canton codes (BE, VD, GE, ZH, etc.) |
| `processTypes` | array | Process types (see below) |
| `pubTypes` | array | Publication types (see below) |
| `cpvCodes` | array | CPV codes (8 digits, e.g., `72000000`) |
| `bkpCodes` | array | BKP construction codes (e.g., `211`) |
| `issuedByOrganizations` | array | UUIDs of issuing organizations |
| `lastItem` | string | Pagination token for next page |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

<details>
<summary>Project Types (projectSubTypes)</summary>

| Code | Description |
|------|-------------|
| `construction` | Construction works |
| `service` | Services |
| `supply` | Supplies |
| `project_competition` | Project competitions |
| `idea_competition` | Idea competitions |
| `overall_performance_competition` | Overall performance competitions |
| `project_study` | Project studies |
| `idea_study` | Idea studies |
| `overall_performance_study` | Overall performance studies |
| `request_for_information` | Requests for information |

</details>

<details>
<summary>Process Types (processTypes)</summary>

| Code | Description |
|------|-------------|
| `open` | Open procedure |
| `selective` | Selective procedure |
| `invitation` | Invitation procedure |
| `direct` | Direct award |
| `no_process` | No procedure (e.g., RFI) |

</details>

<details>
<summary>Publication Types (pubTypes)</summary>

| Code | Description |
|------|-------------|
| `advance_notice` | Advance notice |
| `request_for_information` | Request for information |
| `tender` | Tender |
| `competition` | Competition |
| `study_contract` | Study contract |
| `award_tender` | Award (tender) |
| `award_study_contract` | Award (study) |
| `award_competition` | Award (competition) |
| `direct_award` | Direct award |
| `participant_selection` | Participant selection |
| `selective_offering_phase` | Selective offering phase |
| `correction` | Correction |
| `revocation` | Revocation |
| `abandonment` | Abandonment |

</details>

<details>
<summary>Swiss Cantons</summary>

```
AG, AI, AR, BE, BL, BS, FR, GE, GL, GR, JU, LU, NE, NW, OW, SG, SH, SO, SZ, TG, TI, UR, VD, VS, ZG, ZH
```

</details>

</details>

<details>
<summary><code>get_tender_details</code> — Get full details of a specific tender</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | uuid | Project ID |
| `publicationId` | uuid | Publication ID |
| `lang` | string | Preferred language |
| `fullRaw` | boolean | Append the full unmodified API response JSON (default: `false`) |

</details>

<details>
<summary><code>search_cpv_codes</code> / <code>search_bkp_codes</code> / <code>search_npk_codes</code> / <code>search_oag_codes</code> — Search nomenclature codes</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search term (keyword or code prefix) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

</details>

<details>
<summary><code>browse_cpv_tree</code> / <code>browse_bkp_tree</code> / <code>browse_npk_tree</code> / <code>browse_oag_tree</code> — Navigate code hierarchies</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `parentCode` | string | Parent code (optional, omit for root categories) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

</details>

<details>
<summary><code>list_cantons</code> — List all Swiss cantons</summary>

No parameters required.

</details>

<details>
<summary><code>list_institutions</code> — List Swiss public institutions that publish tenders</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Filter by name (min 3 characters, optional) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

</details>

<details>
<summary><code>get_publication_history</code> — Get the publication history for a project</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `publicationId` | uuid | Current publication ID |
| `lotId` | uuid | Lot ID (optional, to filter by lot) |

</details>

<details>
<summary><code>search_proc_offices</code> — Search public procurement offices</summary>

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Name to search (min 3 characters) |
| `institutionId` | uuid | Filter by parent institution (optional) |

</details>

## Listed on

* [Official MCP Registry](https://registry.modelcontextprotocol.io/?q=io.github.Digilac%2Fsimap-mcp)
* [Awesome MCP Servers](https://mcpservers.org/servers/digilac/simap-mcp)
* [LobeHub](https://lobehub.com/mcp/digilac-simap-mcp)
* [MCP.so](https://mcp.so/server/simap-mcp-server/Digilac)
* [MCP Market](https://mcpmarket.com/server/simap)
* [MCP Marketplace](https://mcp-marketplace.io/server/io-github-digilac-simap-mcp)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and commands, and [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture and internal patterns.

## SIMAP API

This server uses the public API from [SIMAP.ch](https://www.simap.ch/api-doc/).

## License

[MIT](./LICENSE)
