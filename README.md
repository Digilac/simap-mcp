# SIMAP MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

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

## Installation

### Prerequisites

- Node.js 20+
- npm

### Build

```bash
git clone https://github.com/Digilac/simap-mcp.git
cd simap-mcp
npm install
npm run build
```

## Configuration

### Claude Code (CLI)

Add to `~/.claude/settings.json`:

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

### Claude Desktop

Add to your Claude Desktop configuration file:

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

## Usage

Once configured, simply ask Claude:

**Search today's tenders:**
> "Show me new tenders published today"

**Filter by type and canton:**
> "Find construction tenders in canton Vaud"

**Get details:**
> "Give me the details of this tender" (after a search)

**Keyword search:**
> "Find public contracts related to IT in Geneva"

**Find CPV codes:**
> "Search CPV codes for IT services"

**Browse code hierarchies:**
> "Show root CPV categories"
> "Show subcategories of CPV code 72000000"

**Search construction codes:**
> "Search BKP codes for masonry"

**View project history:**
> "Show me the publication history of this project"

**Search procurement offices:**
> "Find procurement offices in the city of Zurich"

## Reference

### `search_tenders`

Search public tenders.

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

### `get_tender_details`

Get tender details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | uuid | Project ID |
| `publicationId` | uuid | Publication ID |
| `lang` | string | Preferred language |

### `search_cpv_codes` / `search_bkp_codes` / `search_npk_codes` / `search_oag_codes`

Search nomenclature codes by keyword or number.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search term (keyword or code prefix) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

### `browse_cpv_tree` / `browse_bkp_tree` / `browse_npk_tree` / `browse_oag_tree`

Navigate code hierarchies.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parentCode` | string | Parent code (optional, omit for root categories) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

### `list_cantons`

List all Swiss cantons with their codes. No parameters required.

### `list_institutions`

List Swiss public institutions that publish tenders.

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Filter by name (min 3 characters, optional) |
| `lang` | string | Language: `de`, `fr`, `it`, `en` (default: `en`) |

### `get_publication_history`

Get the publication history for a project.

| Parameter | Type | Description |
|-----------|------|-------------|
| `publicationId` | uuid | Current publication ID |
| `lotId` | uuid | Lot ID (optional, to filter by lot) |

### `search_proc_offices`

Search public procurement offices.

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Name to search (min 3 characters) |
| `institutionId` | uuid | Filter by parent institution (optional) |

### Enums

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

## Development

```bash
npm run build          # Compile TypeScript
npm start              # Run the server
npm run dev            # Build + run
npm test               # Run tests
npm run lint           # Lint code
npm run format         # Format code
```

### Project Structure

```
simap-mcp/
├── src/
│   ├── index.ts                  # Entry point
│   ├── server.ts                 # MCP server configuration
│   ├── api/
│   │   ├── client.ts             # SIMAP HTTP client
│   │   └── endpoints.ts          # Endpoint constants
│   ├── tools/
│   │   ├── search-tenders.ts
│   │   ├── get-tender-details.ts
│   │   ├── codes/                # Nomenclature tools (CPV, BKP, NPK, OAG)
│   │   └── organizations/        # Institution & procurement office tools
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Translation & formatting helpers
├── tests/
├── dist/                         # Compiled output
└── package.json
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## SIMAP API

This server uses the public API from [SIMAP.ch](https://www.simap.ch/api-doc/).

## License

[MIT](./LICENSE)

