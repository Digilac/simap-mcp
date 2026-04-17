# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that integrates with SIMAP.ch, Switzerland's public procurement platform. Exposes 14 tools for searching and retrieving tender information, nomenclature codes (CPV/BKP/NPK/OAG), and organization data.

## Documentation

| File | Purpose |
|------|---------|
| [README.md](./README.md) | User documentation, installation, usage |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture, key patterns, endpoint map |
| [CHANGELOG.md](./CHANGELOG.md) | Keep a Changelog — bump before every release |
| [SECURITY.md](./SECURITY.md) | Threat model, deployment guidance, debug mode |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |

## Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm start            # Run the server
npm run dev          # Build and run in one step
npm run lint         # Check code style
npm run format       # Format with Prettier
npm run format:check # Check formatting (used in CI)
npm run typecheck    # tsc --noEmit
npm test             # Run tests with vitest
npm run test:watch   # Run tests in watch mode
```

## Source Layout

```
src/
├── index.ts                          # Entry point
├── server.ts                         # MCP server config + stdio transport
├── api/
│   ├── index.ts                      # Re-exports
│   ├── client.ts                     # SimapClient + exported buildUrl()
│   ├── endpoints.ts                  # API endpoint constants
│   └── rate-limiter.ts               # SlidingWindowRateLimiter (FIFO)
├── tools/
│   ├── index.ts                      # registerTools()
│   ├── search-tenders.ts             # search_tenders
│   ├── search-tenders-params.ts      # SEARCH_TENDERS_PARAM_MAP + buildTenderSearchQuery()
│   ├── get-tender-details.ts         # get_tender_details
│   ├── codes/
│   │   ├── index.ts
│   │   ├── list-cantons.ts           # list_cantons
│   │   ├── search-{cpv,bkp,npk,oag}-codes.ts
│   │   └── browse-{cpv,bkp,npk,oag}-tree.ts
│   └── organizations/
│       ├── index.ts
│       ├── list-institutions.ts
│       ├── search-proc-offices.ts
│       └── get-publication-history.ts
├── types/
│   ├── index.ts                      # Re-exports
│   ├── api.ts                        # API response types (SimapApiError, ...)
│   ├── common.ts                     # Translation, Language, Pagination
│   ├── tools.ts                      # Parameter enums
│   └── schemas.ts                    # Shared Zod primitives
└── utils/
    ├── index.ts                      # Re-exports
    ├── errors.ts                     # toToolErrorResult()
    ├── translation.ts                # getTranslation() with fallback chain
    └── formatting.ts                 # Markdown formatting
```

Tests mirror this tree under `tests/` (see [ARCHITECTURE.md](./ARCHITECTURE.md) for details).

## Key Patterns

- **Tool registration** — each tool exports `*InputShape` (raw Zod shape), `*InputSchema` (`z.object(shape)`), `*Input` (inferred type), and a `register*()` function. The shape is passed to `server.tool(...)`; tests import the schema directly to avoid drift.
- **API client** — `SimapClient` (singleton `simap`) wraps `fetch`, handles URL building (via the module-level exported `buildUrl()`), timeouts, Zod response validation, and typed error mapping. It composes a `SlidingWindowRateLimiter` (default 60 req/min, FIFO-ordered, single outstanding timer).
- **Error handling** — tool handlers route caught errors through `toToolErrorResult()` (`src/utils/errors.ts`) which distinguishes `SimapApiError` 404 / other 4xx / 5xx / network / timeout / generic. Always logs the original error to stderr first.
- **search_tenders parameter mapping** — user→SIMAP parameter translation lives in `src/tools/search-tenders-params.ts`, not in the handler. Defaults `publicationFrom` to today (Europe/Zurich) when no filter is provided.
- **Debug logging** — `SIMAP_MCP_DEBUG=1` enables verbose stderr logs (URL, status, UTF-8 byte size, duration). Off by default.
- **Translation** — `getTranslation(t, lang)` with fallback chain: requested lang → de → fr → en → it.

## Code Conventions

- **Files**: kebab-case (`search-tenders.ts`)
- **Functions**: camelCase (`registerSearchTenders`)
- **Classes / Types**: PascalCase (`SimapClient`, `ProjectSearchEntry`)
- **MCP tools**: snake_case (`search_tenders`)
- **Constants**: UPPER_SNAKE (`SIMAP_API_BASE`)
- **TypeScript**: strict mode is enforced (`tsconfig.json`). Never use `any` — prefer `unknown` and narrow.
- **Commits**: Conventional Commits format — `type(scope): short description`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Example: `feat(tools): add search_xxx tool`.

## Development Workflow

1. **Write tests for every new feature or tool.** Tests are mandatory.
2. Run `npm run format` and `npm run typecheck` before committing.
3. Update [CHANGELOG.md](./CHANGELOG.md) under `[Unreleased]` as you go (see [CHANGELOG Usage](#changelog-usage) below).
4. Update [ARCHITECTURE.md](./ARCHITECTURE.md) / [SECURITY.md](./SECURITY.md) when patterns or threat model change.

## Testing

- Test files: `tests/{module-path}/{module}.test.ts` — mirror the source structure.
- For each tool, cover:
  1. **Schema validation** — Zod accepts valid inputs and rejects invalid ones (import the real schema).
  2. **Query parameter building** — user inputs map correctly to SIMAP API params.
  3. **Response formatting** — output is correctly formatted for the user.
- For `api/client.ts` and `api/rate-limiter.ts`, cover URL building, timeout, schema validation, error mapping, debug logging, FIFO ordering, and windowing.

## CHANGELOG Usage

The project follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Every user-visible change lands in [CHANGELOG.md](./CHANGELOG.md) **under `[Unreleased]` as part of the same PR that introduces it** — not at release time.

Use these section headers, in this order:

- **Added** — new features (new tool, new env var, new export).
- **Changed** — behavior change in existing functionality (parameter mapping, target bump, refactor with user-visible impact).
- **Deprecated** — still works, but will be removed.
- **Removed** — deleted feature or file.
- **Fixed** — bug fix.
- **Security** — vulnerability fix (link the GHSA advisory).
- **Documentation** — doc-only changes worth mentioning.

One bullet = one concrete change. Lead with the affected symbol/file/tool in backticks, then the "what" and, when non-obvious, the "why".

## Release Process

1. Verify everything is green: `npm run lint && npm run typecheck && npm run build && npm test`.
2. Move entries from `[Unreleased]` to a new dated section in [CHANGELOG.md](./CHANGELOG.md). Keep an empty `[Unreleased]` header on top.
3. Bump `version` in `package.json` **and** `server.json` (both root `version` and `packages[0].version`).
4. Run `npm install` to update `package-lock.json`.
5. Commit (`chore: release v<version>`), push to `main`.
6. `gh release create v<version>` — creates the tag and triggers `publish.yml`, which publishes to npm and to the MCP Registry via `mcp-publisher`. Use the [Release Notes Template](#release-notes-template) below for the release body.

### Release Notes Template

```markdown
## <emoji> <Title>

<One-line summary of the release.>

### <Category> (e.g. New Features, Security, Dependency Upgrades, Bug Fixes)

- **Change description** — context or reason for the change

### Tests

- <N> tests across <N> test files — all passing

**Full Changelog**: https://github.com/Digilac/simap-mcp/compare/v<previous>...v<current>
```

Emoji conventions: 🚀 New features · 🔒 Security · 📦 Dependencies · 🐛 Bug fixes · ♻️ Refactoring
