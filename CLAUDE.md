# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that integrates with SIMAP.ch, Switzerland's public procurement platform. Exposes tools for searching and retrieving tender information, nomenclature codes, and organization data.

## Documentation

| File | Purpose |
|------|---------|
| [README.md](./README.md) | User documentation, installation, usage |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Modular architecture |
| [ROADMAP.md](./ROADMAP.md) | Roadmap and future plans |
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

## Architecture

```
src/
├── index.ts                          # Entry point
├── server.ts                         # MCP server config + stdio transport
├── api/
│   ├── client.ts                     # HTTP client (fetch wrapper)
│   └── endpoints.ts                  # API endpoint constants
├── tools/
│   ├── index.ts                      # Tool registration
│   ├── search-tenders.ts             # search_tenders
│   ├── get-tender-details.ts         # get_tender_details
│   ├── codes/                        # Nomenclature tools
│   │   ├── list-cantons.ts           # list_cantons
│   │   ├── search-cpv-codes.ts       # search_cpv_codes
│   │   ├── search-bkp-codes.ts       # search_bkp_codes
│   │   ├── search-npk-codes.ts       # search_npk_codes
│   │   ├── search-oag-codes.ts       # search_oag_codes
│   │   ├── browse-cpv-tree.ts        # browse_cpv_tree
│   │   ├── browse-bkp-tree.ts        # browse_bkp_tree
│   │   ├── browse-npk-tree.ts        # browse_npk_tree
│   │   └── browse-oag-tree.ts        # browse_oag_tree
│   └── organizations/                # Institution tools
│       ├── list-institutions.ts      # list_institutions
│       ├── search-proc-offices.ts    # search_proc_offices
│       └── get-publication-history.ts # get_publication_history
├── types/
│   ├── api.ts                        # API response types
│   ├── common.ts                     # Shared types
│   └── tools.ts                      # Tool input types
└── utils/
    ├── translation.ts                # i18n helpers
    └── formatting.ts                 # Markdown formatting
```

## Key Components

- **McpServer** from `@modelcontextprotocol/sdk` — handles MCP protocol
- **StdioServerTransport** — communication via stdin/stdout
- **Zod schemas** — runtime validation of tool inputs
- **Native fetch** — HTTP calls to SIMAP API

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/publications/v2/project/project-search` | Search with filters |
| `/publications/v2/project/{projectId}/project-header` | Project metadata |
| `/publications/v1/project/{projectId}/publication-details/{publicationId}` | Full details |
| `/publications/v1/publication/{publicationId}/past-publications` | Publication history |
| `/codes/v1/cpv/search`, `/codes/v1/cpv` | CPV code search and tree |
| `/codes/v1/bkp/search`, `/codes/v1/bkp` | BKP code search and tree |
| `/codes/v1/npk/search`, `/codes/v1/npk` | NPK code search and tree |
| `/codes/v1/oag/search`, `/codes/v1/oag` | OAG code search and tree |
| `/cantons/v1` | Canton list |
| `/institutions/v1/institutions` | Institution list |
| `/procoffices/v1/po/public` | Procurement offices |

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

1. **Write tests for every new feature**
2. Run `npm run format` before committing
3. Update documentation as needed

## Testing

**Tests are mandatory for every new feature or tool.**

- Test files: `tests/{module-path}/{module}.test.ts` — mirror the source structure
- Use `describe` blocks to group related tests
- Use clear test names: `it("should reject invalid CPV codes")`

For each tool, test:
1. **Schema validation** — Zod schema accepts valid inputs and rejects invalid ones
2. **Query parameter building** — Parameters are correctly mapped to API query params
3. **Response formatting** — Output is correctly formatted for the user

## Release Process

1. Update `version` in `package.json` and `server.json` (both root and `packages[0].version`)
2. Run `npm install` to update `package-lock.json`
3. Commit and push to `main`
4. Create a GitHub release with `gh release create v<version>` (this creates the tag and triggers the workflow)
5. The `publish.yml` workflow will automatically:
   - Publish the package to npm
   - Publish the server metadata to the MCP Registry via `mcp-publisher`

## Release Notes Template

Use this template when creating a GitHub release with `gh release create`:

```markdown
## <emoji> <Title>

<One-line summary of the release.>

### <Category> (e.g. New Features, Security, Dependency Upgrades, Bug Fixes)

- **Change description** — context or reason for the change
- **Another change** — details

### Tests

- <N> tests across <N> test files — all passing

**Full Changelog**: https://github.com/Digilac/simap-mcp/compare/v<previous>...v<current>
```

Emoji conventions: 🚀 New features, 🔒 Security, 📦 Dependencies, 🐛 Bug fixes, ♻️ Refactoring

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
