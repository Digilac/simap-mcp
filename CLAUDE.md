# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that integrates with SIMAP.ch, Switzerland's public procurement platform. Exposes tools for searching and retrieving tender information.

## Documentation

| File | Purpose |
|------|---------|
| [README.md](./README.md) | User documentation, installation, usage |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Target modular architecture |
| [ROADMAP.md](./ROADMAP.md) | Planned features by phase |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |

## Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm start            # Run the server
npm run dev          # Build and run in one step
npm run lint         # Check code style
npm run format       # Format code with Prettier
npm run format:check # Check formatting (used in CI)
npm test             # Run tests with vitest
npm run test:watch   # Run tests in watch mode
```

## Current Architecture

**Single-file design** (`src/index.ts` ~380 lines) - to be refactored per [ARCHITECTURE.md](./ARCHITECTURE.md):

```
Claude Code (MCP Client)
        │ stdio (JSON-RPC)
        ▼
simap-mcp Server (McpServer)
  ├── search_tenders tool
  └── get_tender_details tool
        │ HTTPS fetch
        ▼
SIMAP.ch API (https://simap.ch/api)
```

## Target Architecture (Phase 0)

```
src/
├── index.ts              # Entry point
├── server.ts             # MCP server config
├── api/
│   ├── client.ts         # HTTP client
│   └── endpoints.ts      # API endpoints
├── tools/
│   ├── index.ts          # Tool registration
│   ├── search-tenders.ts
│   ├── get-tender-details.ts
│   ├── codes/            # Nomenclature tools
│   └── organizations/    # Institution tools
├── types/
│   ├── api.ts            # API response types
│   └── common.ts         # Shared types
└── utils/
    ├── translation.ts    # i18n helpers
    └── formatting.ts     # Markdown formatting
```

## Key Components

- **McpServer** from `@modelcontextprotocol/sdk` - handles MCP protocol
- **StdioServerTransport** - communication via stdin/stdout
- **Zod schemas** - runtime validation of tool inputs
- **Native fetch** - HTTP calls to SIMAP API

## Current Tools

1. **search_tenders** - Search public procurement with filters
   - Basic: search, publicationFrom, publicationUntil, projectSubTypes, cantons, lang
   - Advanced (Phase 1): processTypes, pubTypes, cpvCodes, bkpCodes, issuedByOrganizations, lastItem

2. **get_tender_details** - Get full details for a specific tender
   - Parameters: projectId (UUID), publicationId (UUID), lang

## Planned Tools (see ROADMAP.md)

- `search_cpv_codes` - Search CPV nomenclature
- `list_cantons` - List Swiss cantons
- `list_institutions` - List public institutions
- `search_proc_offices` - Search procurement offices
- `get_publication_history` - Publication history
- `search_bkp_codes`, `search_npk_codes`, `search_oag_codes` - Construction codes

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/publications/v2/project/project-search` | Search with filters |
| `/publications/v2/project/{projectId}/project-header` | Project metadata |
| `/publications/v1/project/{projectId}/publication-details/{publicationId}` | Full details |
| `/codes/v1/cpv/search` | CPV code search (planned) |
| `/cantons/v1` | Canton list (planned) |
| `/institutions/v1/institutions` | Institution list (planned) |

## Multilingual Support

`getTranslation()` handles fallback: requested lang → de → fr → en → it

Supported languages: `de`, `fr`, `it`, `en`

## Code Conventions

- **Files**: kebab-case (`search-tenders.ts`)
- **Functions**: camelCase (`registerSearchTenders`)
- **Types**: PascalCase (`ProjectSearchEntry`)
- **MCP Tools**: snake_case (`search_tenders`)
- **Constants**: UPPER_SNAKE (`SIMAP_API_BASE`)

## Development Workflow

1. Check [ROADMAP.md](./ROADMAP.md) for current phase
2. Follow structure in [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Write tests for every new feature** (see Testing section below)
4. Update documentation as needed
5. Run `npm run format` before committing
6. **IMPORTANT**: After completing a phase, update the checklist in [ROADMAP.md](./ROADMAP.md) (mark tasks as `[x]`)

## Testing

**Tests are mandatory for every new feature or tool.**

### Test Structure

```
tests/
├── tools/
│   ├── search-tenders.test.ts    # Tests for search_tenders
│   └── get-tender-details.test.ts # Tests for get_tender_details
├── api/
│   └── client.test.ts            # Tests for API client
└── utils/
    └── translation.test.ts       # Tests for utilities
```

### What to Test

For each tool, test:
1. **Schema validation** - Zod schema accepts valid inputs and rejects invalid ones
2. **Query parameter building** - Parameters are correctly mapped to API query params
3. **Response formatting** - Output is correctly formatted for the user

### Running Tests

```bash
npm test           # Run all tests once
npm run test:watch # Run tests in watch mode during development
```

### Test Conventions

- Test files: `{module}.test.ts`
- Use `describe` blocks to group related tests
- Use clear test names: `it("should reject invalid CPV codes")`
- Mirror the source structure in `tests/`

## MCP Integration

Add to Claude Code config (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "simap": {
      "command": "node",
      "args": ["/path/to/simap-mcp/dist/index.js"]
    }
  }
}
```
