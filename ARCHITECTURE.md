# simap MCP Server - Architecture

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
simap.ch API (https://simap.ch/api)
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

Each tool file exports a `register*` function that takes an `McpServer`. The third argument is a raw Zod shape (plain object of fields), not a `z.object(...)`; the matching `*InputSchema` is also exported alongside for tests.

```typescript
export const searchTendersInputShape = { /* fields */ } as const;
export const searchTendersInputSchema = z.object(searchTendersInputShape);

export function registerSearchTenders(server: McpServer): void {
  server.tool("search_tenders", "Description", searchTendersInputShape, handler);
}
```

Tools are grouped by domain (`codes/`, `organizations/`) with an `index.ts` that registers the group.

### API Client

`SimapClient` is a singleton (`simap`) that handles URL building, query parameters, timeouts, and error handling. All tools use it instead of calling `fetch` directly.

The client composes a `SlidingWindowRateLimiter` (default: 60 req/min, FIFO-ordered, single outstanding timer). `buildUrl` is exported as a standalone function so it can be unit-tested without instantiating a client.

### Translation

`getTranslation(t, lang)` extracts text with fallback: requested lang -> de -> fr -> en -> it.

### Error Handling

Tool handlers convert caught errors through `toToolErrorResult()` (`src/utils/errors.ts`), which returns a user-facing message that distinguishes:

- `SimapApiError` with `statusCode === 404` → "not found" message
- `SimapApiError` 4xx (other than 404) → "simap rejected the request" (HTTP status included)
- `SimapApiError` 5xx → "simap is currently unavailable"
- `AbortError` / `fetch failed` / `ECONNREFUSED` / `ETIMEDOUT` → "Network or timeout error"
- Anything else → generic fallback

The original error is always logged to stderr first for operator debugging.

### Parameter Mapping (search_tenders)

The simap API uses different parameter names than the tool surface. The mapping and default-filter logic live in `src/tools/search-tenders-params.ts` (`SEARCH_TENDERS_PARAM_MAP` constant, `buildTenderSearchQuery()` function), not inline in the handler.

| User-facing | simap API | Transform |
|---|---|---|
| `search` | `search` | — |
| `publicationFrom` | `newestPublicationFrom` | — |
| `publicationUntil` | `newestPublicationUntil` | — |
| `projectSubTypes` | `projectSubTypes` | skip empty array |
| `cantons` | `orderAddressCantons` | `.toUpperCase()` on each |
| `processTypes` | `processTypes` | skip empty array |
| `pubTypes` | `newestPubTypes` | skip empty array |
| `cpvCodes` | `cpvCodes` | skip empty array |
| `bkpCodes` | `bkpCodes` | skip empty array |
| `issuedByOrganizations` | `issuedByOrganizations` | skip empty array |
| `lastItem` | `lastItem` | — |

If no filter is provided, `publicationFrom` defaults to today's date so the API call does not return the full dataset.

### Debug Logging

When `SIMAP_MCP_DEBUG=1` (or `true`), the HTTP client emits verbose stderr logs (full URL, response status, byte size, duration). Default is off — see [SECURITY.md](./SECURITY.md#debug-mode).

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
