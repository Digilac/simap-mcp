# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that integrates with simap.ch, Switzerland's public procurement platform. Exposes 14 tools for searching and retrieving tender information, nomenclature codes (CPV/BKP/NPK/OAG), and organization data.

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
- **search_tenders parameter mapping** — user→simap parameter translation lives in `src/tools/search-tenders-params.ts`, not in the handler. Defaults `publicationFrom` to today (Europe/Zurich) when no filter is provided.
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
3. **Add a changeset for user-visible changes**: `npx changeset` (see [Changesets](#changesets) below). Internal-only changes (tests, CI tweaks, refactors with no user-visible effect) don't need one.
4. Update [ARCHITECTURE.md](./ARCHITECTURE.md) / [SECURITY.md](./SECURITY.md) when patterns or threat model change.

## Testing

- Test files: `tests/{module-path}/{module}.test.ts` — mirror the source structure.
- For each tool, cover:
  1. **Schema validation** — Zod accepts valid inputs and rejects invalid ones (import the real schema).
  2. **Query parameter building** — user inputs map correctly to simap API params.
  3. **Response formatting** — output is correctly formatted for the user.
- For `api/client.ts` and `api/rate-limiter.ts`, cover URL building, timeout, schema validation, error mapping, debug logging, FIFO ordering, and windowing.

## Changesets

Versioning, `CHANGELOG.md`, and GitHub Releases are driven by [changesets](https://github.com/changesets/changesets). Add a changeset for any user-visible change; internal-only changes (tests, CI tweaks, refactors with no user-visible effect) don't need one. The [changeset-bot](https://github.com/apps/changeset-bot) comments on each PR with the current status. One bullet = one concrete change; lead with the affected symbol/file/tool in backticks, then the "what" and the "why".

```bash
npx changeset
```

The CLI prompts for the bump level (`patch` / `minor` / `major`) and a summary, then writes `.changeset/<name>.md`. Commit it with the rest of the change.

Bump-level guide:

- **patch** — bug fix, doc update, dependency bump, refactor with no user-visible API change.
- **minor** — new tool, new MCP capability, new opt-in env var or parameter.
- **major** — breaking change to a tool's input/output schema, removal of a tool, or any change that requires a consumer update.

## Release Process

Releases are automated by `.github/workflows/release.yml`:

1. Merge feature/fix PRs into `main`. Each user-visible PR carries its own `.changeset/*.md`.
2. `release.yml` opens (or updates) a **Version Packages** PR that bumps `package.json`, syncs `server.json` (via `scripts/sync-server-json.mjs`), refreshes `package-lock.json`, and consumes pending changesets into `CHANGELOG.md`.
3. Review and merge the Version Packages PR.
4. `release.yml` re-runs and: publishes to npm via OIDC (`changeset publish`), creates the git tag, creates the GitHub Release with PR-author credit (via `@changesets/changelog-github`), then publishes to the MCP Registry (`mcp-publisher`).

The auto-generated GitHub Release content is changesets-style (`### Patch Changes`, `### Minor Changes` with `Thanks @user!`). For headline releases, polish manually via `gh release edit` after the workflow finishes.
