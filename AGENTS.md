# AGENTS.md

Guidance for coding agents working in this repository. `CLAUDE.md` is a symlink to this file, so every tool reads the same rules.

## Project Overview

MCP (Model Context Protocol) server that integrates with simap.ch, Switzerland's public procurement platform. Exposes 14 tools, 1 prompt (`analyze_tender`) and 1 Skill (`simap-workflow`, MCP Skills extension) for searching and retrieving tender information, nomenclature codes (CPV/BKP/NPK/OAG), and organization data.

## Documentation

| File                                            | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [README.md](./README.md)                        | User documentation, installation, usage                            |
| [ARCHITECTURE.md](./ARCHITECTURE.md)            | Architecture, key patterns, endpoint map                           |
| [CHANGELOG.md](./CHANGELOG.md)                  | Generated from `.changeset/*.md` by `@changesets/changelog-github` |
| [SECURITY.md](./SECURITY.md)                    | Disclosure policy, security invariants, deployment guidance        |
| [Threat model](./docs/security/threat-model.md) | Assets, actors, entry points and trust boundaries                  |
| [CONTRIBUTING.md](./CONTRIBUTING.md)            | Contribution guidelines                                            |

## Commands

```bash
npm run build        # Compile src/ to dist/ (tsc -p tsconfig.build.json)
npm start            # Run the server
npm run dev          # Recompile on every save (tsc -p tsconfig.build.json --watch)
npm run inspect      # MCP Inspector UI against dist/ (respawns the server per connection)
npm run tools        # List tools + input schemas via the fastmcp CLI (smoke check)
npm run lint         # ESLint on the whole repo; warnings fail
npm run format       # Format the whole repo with Prettier
npm run format:check # Check formatting (used in CI)
npm run typecheck    # tsc --noEmit on src/, tests/ and scripts/
npm test             # Run tests with vitest
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Tests + coverage thresholds (used in CI)
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
│   ├── rate-limiter.ts               # SlidingWindowRateLimiter (FIFO)
│   └── response-cache.ts             # ResponseCache (TTL + LRU) for reference data
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
├── prompts/
│   ├── index.ts                      # registerPrompts()
│   └── analyze-tender.ts             # analyze_tender + shared analysis sections/rules
├── skills/
│   ├── index.ts                      # registerSkills() — server.skills() catalog
│   └── simap-workflow.ts             # simap-workflow Skill (SKILL.md built in code)
├── types/
│   ├── index.ts                      # Re-exports
│   ├── api.ts                        # API response types (SimapApiError, ...)
│   ├── common.ts                     # Translation, Language, Pagination
│   ├── tools.ts                      # Parameter enums
│   └── schemas.ts                    # Shared Zod primitives
└── utils/
    ├── index.ts                      # Re-exports
    ├── errors.ts                     # toToolErrorResult(), toolErrorResult()
    ├── register-tool.ts              # registerTool() — FastMCP wrapper
    ├── translation.ts                # getTranslation() with fallback chain
    └── formatting.ts                 # Markdown formatting
```

Tests mirror this tree under `tests/` (see [ARCHITECTURE.md](./ARCHITECTURE.md) for details).

## Key Patterns

- **Tool registration** — the server is built on [FastMCP for TypeScript](https://github.com/PrefectHQ/fastmcp-ts) (`@prefecthq/fastmcp-ts`). Each tool exports `*InputSchema` (`z.object({...})`), `*Input` (inferred type), and a `register*()` function that takes a `FastMCP` instance and calls the shared `registerTool(server, { name, title, description, input: schema }, handler)` (`src/utils/register-tool.ts`) — never `server.tool()` directly. The helper advertises an input-mode JSON Schema (so `.default()` fields are not `required`), attaches the read-only tool annotations (`readOnlyHint: true`, …) and the `title`, and returns validation failures as `isError` tool results with field paths instead of FastMCP's protocol errors. Handlers return Markdown strings directly (FastMCP wraps them in a text content block) or a `ToolResult` for errors — never `throw` for user-facing errors; tests import the schema directly to avoid drift.
- **Prompts** — each prompt in `src/prompts/` exports an args schema, a pure `build*Prompt()` and a `register*()` that calls `server.prompt()`. Prompts only emit instructions that drive the existing tools; invalid args are thrown (prompts have no `isError` result).
- **Skills** — `src/skills/` publishes Skills with `server.skills()` (MCP Skills extension). Each Skill builds its `SKILL.md` in code and reuses the prompt constants it shares (e.g. `TENDER_ANALYSIS_SECTIONS` / `TENDER_ANALYSIS_RULES` from `analyze-tender.ts`) so they cannot drift. Skills only document the existing tools.
- **API client** — `SimapClient` (singleton `simap`) wraps `fetch`, handles URL building (via the module-level exported `buildUrl()`), timeouts, Zod response validation, and typed error mapping. It composes a `SlidingWindowRateLimiter` (default 60 req/min, FIFO-ordered, single outstanding timer) and a `ResponseCache`: pass `cacheTtlMs: REFERENCE_DATA_TTL_MS` for reference data (codes, cantons, institutions), never for tenders.
- **Error handling** — tool handlers route caught errors through `toToolErrorResult()` (`src/utils/errors.ts`) which returns a FastMCP `ToolResult` (`isError: true`) and distinguishes `SimapApiError` 404 / other 4xx / 5xx / network / timeout / generic. Always logs the original error to stderr first. Application-level validation (e.g. "at least one of X/Y") uses `toolErrorResult(text)`.
- **Transport** — stdio only. `startServer()` passes `{ transport: "stdio" }` and neutralises FastMCP's `MCP_TRANSPORT` env override (see SECURITY.md).
- **search_tenders parameter mapping** — user→simap parameter translation lives in `src/tools/search-tenders-params.ts`, not in the handler. Defaults `publicationFrom` to today (Europe/Zurich) when no filter is provided.
- **Debug logging** — `SIMAP_MCP_DEBUG=1` enables verbose stderr logs (URL, status, UTF-8 byte size, duration). Off by default.
- **Translation** — `getTranslation(t, lang)` with fallback chain: requested lang → de → fr → en → it.

## Code Conventions

- **Files**: kebab-case (`search-tenders.ts`)
- **Functions**: camelCase (`registerSearchTenders`)
- **Classes / Types**: PascalCase (`SimapClient`, `ProjectSearchEntry`)
- **MCP tools**: snake_case (`search_tenders`)
- **Constants**: UPPER_SNAKE (`SIMAP_API_BASE`)
- **TypeScript**: strict mode is enforced (`tsconfig.json`, which type-checks `src/`, `tests/` and `scripts/`; `tsconfig.build.json` emits `src/` only). Never use `any` — prefer `unknown` and narrow; ESLint rejects it.
- **Commits**: Conventional Commits format — `type(scope): short description`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Example: `feat(tools): add search_xxx tool`.

## Development Workflow

1. **Write tests for every new feature or tool.** Tests are mandatory.
2. Run `npm run format`, `npm run lint` and `npm run typecheck` before committing. They cover `src/`, `tests/` and `scripts/`.
3. **Add a changeset for user-visible changes**: `npx changeset` (see [Changesets](#changesets) below). Internal-only changes (tests, CI tweaks, refactors with no user-visible effect) don't need one.
4. Update [ARCHITECTURE.md](./ARCHITECTURE.md) when patterns change, and [SECURITY.md](./SECURITY.md) and the [threat model](./docs/security/threat-model.md) when the transport, the outbound hosts, the data the server keeps or the release pipeline change.

## Testing

- Test files: `tests/{module-path}/{module}.test.ts` — mirror the source structure.
- For each tool, cover:
  1. **Schema validation** — Zod accepts valid inputs and rejects invalid ones (import the real schema).
  2. **Query parameter building** — user inputs map correctly to simap API params.
  3. **Response formatting** — output is correctly formatted for the user.
- For `api/client.ts`, `api/rate-limiter.ts` and `api/response-cache.ts`, cover URL building, timeout, schema validation, error mapping, debug logging, FIFO ordering, windowing, TTL expiry, LRU eviction, and that errors are never cached.

## Proof

How to prove a change here. The server only reads the public simap API: there are no credentials, no user data and nothing to seed.

- **Checks.** CI runs all five on Node 22, 24 and 26. Each must exit 0 with no diagnostics after npm's script header:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format:check` ends with `All matched files use Prettier code style!`.
  - `npm run build` writes `dist/`.
  - `npm run test:coverage` passes every test and meets the coverage thresholds.
- **The server, in process.** Run `npm run build` first. `--file dist/server.js:createServer` loads the server without its stdio startup:
  - `npm run tools` lists the 14 tools with their input schemas. Use it to prove a registration or schema change.
  - `npx fastmcp call --file dist/server.js:createServer list_cantons` makes one live call and prints the table of 26 cantons. Swap in the tool you changed and its arguments, for example `search_cpv_codes query=software lang=fr`.
  - The same command takes a prompt name with its arguments (`analyze_tender url=<simap link>`) or a resource URI (`skill://simap-workflow/SKILL.md`) and prints the prompt or the Skill. Neither touches the network.
  - Prefix a call with `SIMAP_MCP_DEBUG=1` to see the full outbound URL on stderr. Use it to prove a parameter mapping.
- **The server, as shipped.** `npx fastmcp call --command "node dist/index.js" list_cantons` starts the real entry point over stdio. Use it to prove a change to `src/index.ts`, `src/server.ts` or the transport.
- **Live calls reach the production simap API.** It is public and read-only, so a handful of calls is fine. Never loop over it or load-test it.
- **Regression tests.** `tests/server.test.ts` drives the tools, the prompt and the Skill through an in-process MCP client, with no network.
- **Off limits:** `npm run release`, `npm publish`, `mcp-publisher publish`, and starting `release.yml` by hand. The first two publish to npm, where a version number can never be reused and can rarely be removed; the last two publish to the MCP Registry. To prove a packaging change, run:
  - `npm pack --dry-run`: the tarball it lists must contain only `dist/`, `package.json`, `README.md` and `LICENSE`.
  - `node scripts/sync-server-json.mjs && git diff --exit-code server.json`: it must print `server.json already at <version>` and leave no diff. The script rewrites `server.json` when it is out of sync, so the diff is the check.

## Code Review Rules

Flag a change when:

- **It writes to stdout.** stdout carries the MCP JSON-RPC stream, so a `console.log` or any other print in `src/` corrupts it and disconnects the client. Logs go to stderr with `console.error`.
- **It throws from a tool handler.** A user-facing failure must come back through `toToolErrorResult()` or `toolErrorResult()`. FastMCP turns a throw into an `isError` result that carries the raw exception message, so the user gets an internal error string instead of the guidance those helpers write. A tool registered with `server.tool()` anywhere but `src/utils/register-tool.ts` loses the input-mode schema and the read-only annotations, and its invalid arguments become a protocol error instead of a result that names the fields.
- **It rejects or drops simap data.** simap adds fields and enum values without notice (#144). Tightening a response schema (an enum where a string was, a field made required) turns an upstream addition into a failing tool. Removing `.passthrough()` from the publication-details schemas fails nothing but silently drops the unknown fields that `fullRaw` returns.
- **It trusts input.** User input placed in a URL path must be validated first (the IDs are UUIDs), and query values must go through `buildUrl()`. A new log line must not carry query values (search terms, filters) outside `SIMAP_MCP_DEBUG`. User text echoed into Markdown goes through `formatInlineCode()` or `escapeInlineCode()`.
- **It breaks deployed clients.** Renaming or removing a tool, prompt, Skill or parameter, or making an optional parameter required, breaks every client configured against the published package. It needs a `major` changeset.

Skip `CHANGELOG.md`: changesets generates it. Review `package-lock.json`: it picks the dependency versions that run.

Cite file:line for every finding, and post at most 3 nits.

## Risk

The tier to state in a pull request description. Nothing checks it automatically: it tells the reviewer how much care a change needs. When paths overlap, the higher tier wins.

- **High**
  - CI and release: `.github/workflows/**`, `.github/dependabot.yml`, `.changeset/config.json`, `scripts/**`, `server.json`.
  - Dependencies: `package.json`, `package-lock.json`.
  - What defines the checks: `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`, `.prettierrc`, `.prettierignore`.
  - The only outbound network path and the transport: `src/api/client.ts`, `src/api/endpoints.ts`, `src/server.ts`, `src/utils/register-tool.ts`.
  - The public contract, wherever it lives: renaming or removing a tool, prompt, Skill or parameter, or making an optional parameter required.
  - Files that steer review and shipping: `AGENTS.md`, the `CLAUDE.md` symlink, `SECURITY.md`, `docs/security/threat-model.md`, `.coderabbit.yaml`.
- **Low**
  - Docs: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.changeset/*.md`, `.github/ISSUE_TEMPLATE/**`, `.github/PULL_REQUEST_TEMPLATE.md`.
  - Tests: `tests/**`.
  - Not docs: `src/prompts/**`, `src/skills/**` and tool `description` strings. The model loads them at runtime, so they are Medium.
- **Medium:** everything else.

## Changesets

Versioning, `CHANGELOG.md`, and GitHub Releases are driven by [changesets](https://github.com/changesets/changesets). Add a changeset for any user-visible change with `npx changeset` — internal-only changes (tests, CI, refactors with no user-visible effect) don't need one. One bullet = one concrete change; lead with the affected symbol/file/tool in backticks, then the "what" and the "why". See [`.changeset/README.md`](./.changeset/README.md) for the bump-level guide.

## Release Process

Fully automated by `.github/workflows/release.yml`: merging a PR with changesets opens a **Version Packages** PR that bumps `package.json` + `server.json` and rolls changesets into `CHANGELOG.md`; merging that PR publishes to npm, creates the git tag, the GitHub Release (with `Thanks @user!` credit), and pushes to the MCP Registry. For headline releases, polish the auto-generated release notes via `gh release edit` after the workflow finishes.
