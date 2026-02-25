# SIMAP MCP Server - Architecture

## Overview

```
Claude / AI Assistant (MCP Client)
        │ stdio (JSON-RPC)
        ▼
simap-mcp Server (McpServer)
  ├── tools/          → 14 tools exposed to the client
  ├── api/client.ts   → centralized HTTP client
  └── utils/          → translation & formatting
        │ HTTPS
        ▼
SIMAP.ch API (https://simap.ch/api)
```

## File Structure

```
src/
├── index.ts                  # Entry point (starts server)
├── server.ts                 # MCP server creation & tool registration
│
├── api/
│   ├── index.ts              # Client export
│   ├── client.ts             # SimapClient (HTTP GET, URL building, timeouts)
│   └── endpoints.ts          # API endpoint constants
│
├── tools/
│   ├── index.ts              # registerTools() — registers all tools
│   ├── search-tenders.ts     # search_tenders
│   ├── get-tender-details.ts # get_tender_details
│   │
│   ├── codes/                # Nomenclature tools
│   │   ├── index.ts
│   │   ├── search-cpv-codes.ts
│   │   ├── search-bkp-codes.ts
│   │   ├── search-npk-codes.ts
│   │   ├── search-oag-codes.ts
│   │   ├── browse-cpv-tree.ts
│   │   ├── browse-bkp-tree.ts
│   │   ├── browse-npk-tree.ts
│   │   ├── browse-oag-tree.ts
│   │   └── list-cantons.ts
│   │
│   └── organizations/
│       ├── index.ts
│       ├── list-institutions.ts
│       ├── search-proc-offices.ts
│       └── get-publication-history.ts
│
├── types/
│   ├── index.ts              # Re-exports
│   ├── api.ts                # API response types (SimapApiError, ProjectSearchEntry, etc.)
│   ├── common.ts             # Translation, Language, Pagination
│   └── tools.ts              # Parameter enums (ProjectSubType, ProcessType, PubTypeFilter)
│
└── utils/
    ├── index.ts              # Re-exports
    ├── translation.ts        # getTranslation() with fallback chain
    └── formatting.ts         # Markdown formatting (formatProject, formatCodes, etc.)
```

## Key Patterns

### Tool Registration

Each tool file exports a `register*` function that takes an `McpServer`:

```typescript
export function registerSearchTenders(server: McpServer): void {
  server.tool("search_tenders", "Description", zodSchema, handler);
}
```

Tools are grouped by domain (`codes/`, `organizations/`) with an `index.ts` that registers the group.

### API Client

`SimapClient` is a singleton (`simap`) that handles URL building, query parameters, timeouts, and error handling. All tools use it instead of calling `fetch` directly.

### Translation

`getTranslation(t, lang)` extracts text with fallback: requested lang -> de -> fr -> en -> it.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `search-tenders.ts` |
| Classes | PascalCase | `SimapClient` |
| Functions | camelCase | `registerSearchTenders` |
| Constants | UPPER_SNAKE | `SIMAP_API_BASE` |
| Types/Interfaces | PascalCase | `ProjectSearchEntry` |
| MCP Tools | snake_case | `search_tenders` |

## API Endpoints

| Endpoint | Used by |
|----------|---------|
| `/publications/v2/project/project-search` | `search_tenders` |
| `/publications/v2/project/{id}/project-header` | `get_tender_details` |
| `/publications/v1/project/{id}/publication-details/{pubId}` | `get_tender_details` |
| `/publications/v1/publication/{id}/past-publications` | `get_publication_history` |
| `/codes/v1/cpv/search` | `search_cpv_codes` |
| `/codes/v1/cpv` | `browse_cpv_tree` |
| `/codes/v1/bkp/search` | `search_bkp_codes` |
| `/codes/v1/bkp` | `browse_bkp_tree` |
| `/codes/v1/npk/search` | `search_npk_codes` |
| `/codes/v1/npk` | `browse_npk_tree` |
| `/codes/v1/oag/search` | `search_oag_codes` |
| `/codes/v1/oag` | `browse_oag_tree` |
| `/cantons/v1` | `list_cantons` |
| `/institutions/v1/institutions` | `list_institutions` |
| `/procoffices/v1/po/public` | `search_proc_offices` |
