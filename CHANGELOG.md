# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `ProjectHeaderSchema` and `LotEntrySchema`: `lotTitle` is now `.nullish()` — the SIMAP API can return lots with `lotTitle` absent (e.g. project 29058), which caused a Zod validation error in `get_tender_details` ([#22](https://github.com/Digilac/simap-mcp/pull/22)).

### Documentation

- `README.md` — restructured for clarity: added a **Prerequisites** section (Node.js ≥ 20); added collapsible per-client configuration blocks (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline, Zed); moved each tool in the **Reference** section into its own collapsible block; removed the duplicated **Development** and **Project Structure** sections (now link to `CONTRIBUTING.md` and `ARCHITECTURE.md`); removed the LobeHub badge.

## [1.2.0] - 2026-04-22

### Added

- `get_tender_details`: new `fullRaw` boolean parameter (default `false`). When `true`, the full unmodified publication-details JSON is appended under a `### Full Raw Response` section.

### Changed

- `get_tender_details`: structured Markdown output now reads the real SIMAP response shape (`base`, `dates`, `terms`, `criteria`, `procurement.cpvCode`, `publishers`, `decision`). Previous version read keys that do not exist in the API (`deadlines.*`, `contact.*`, `decision.awardees`), so sections like Deadlines / Conditions / CPV were silently empty. **Breaking** for any consumer that parsed the previous `### Raw Data (excerpt)` block — that section is gone (use `fullRaw: true` for the equivalent JSON).
- `PublicationDetailsSchema` (`src/types/schemas.ts`) and `PublicationDetails` (`src/types/api.ts`) rewritten on the real API keys. Still `.passthrough()` so unknown fields are preserved for `fullRaw`.
- Dev dependencies bumped: `eslint` 10.2.0 → 10.2.1, `typescript` 6.0.2 → 6.0.3, `typescript-eslint` 8.58.2 → 8.59.0, `vitest` 4.1.4 → 4.1.5.

### Removed

- `formatJsonPreview` helper (`src/utils/formatting.ts`). It truncated at 3000 characters, silently dropping ~76% of a typical publication-details response. `get_tender_details` now renders structured fields for the default view and `JSON.stringify(details, null, 2)` verbatim for the `fullRaw` view.

### Fixed

- `get_tender_details`: the 3000-character truncation that clipped most of the useful tender data (deadlines, criteria, conditions, award) is gone.
- `formatPublicationDetails` (`src/utils/formatting.ts`): CPV selection prefers `base.cpvCode` only when it carries a `.code`, so a partial `base.cpvCode` (label only) no longer masks a valid `procurement.cpvCode`.
- `formatPublicationDetails`: Conditions section now includes `terms.termsType` (e.g. `"in_documents"`); previously this populated SIMAP field was dropped.
- `formatPublicationDetails`: Q&A rounds now render `qnas[].externalLink`; a QnA with only a link no longer degrades to `"(no date)"`.

## [1.1.0] - 2026-04-17

### Added

- Input Zod schemas are now exported from every tool module (`*InputShape`, `*InputSchema`, `*Input` type). These become part of the public TypeScript surface.
- `SIMAP_MCP_DEBUG` environment variable enables verbose stderr logging (full URL, response status/size/duration). Off by default.
- `.env.example` documenting supported environment variables.
- Typed tool-error messages distinguish 404 / 4xx / 5xx / network errors instead of returning a single generic message.
- New `SlidingWindowRateLimiter` (FIFO queue, single outstanding timer) replaces the previous busy-wait rate limiter in the HTTP client.
- New `src/utils/errors.ts` exports `toToolErrorResult()` for consistent error handling across tools.
- Test coverage for `src/api/client.ts` (URL building, timeout, schema validation, error mapping, debug logging) and `src/api/rate-limiter.ts` (FIFO ordering, windowing, concurrent acquires).

### Changed

- `search_tenders` parameter mapping refactored into a dedicated helper (`src/tools/search-tenders-params.ts`). The user→SIMAP API parameter mapping is now documented in [ARCHITECTURE.md](./ARCHITECTURE.md).
- `buildUrl` is now a module-level exported function (previously a private method on `SimapClient`) so it can be unit-tested directly. Behavior is unchanged.
- Existing tool tests import the real Zod schemas from the source modules instead of redefining local copies, eliminating schema drift.
- TypeScript compilation target raised from ES2022 to ES2023.

### Removed

- Deleted `ROADMAP.md`. Future intent is tracked through GitHub issues / PRs and this changelog; a placeholder roadmap file added no value.

### Fixed

- `get_tender_details`: when both the project-header and publication-details calls return 404, the tool now throws a typed `SimapApiError(404)` so the user sees the "not found" message instead of a generic error.
- `search_tenders`: the "no filters → default `publicationFrom` to today" fallback now computes the calendar date in `Europe/Zurich` (via `Intl.DateTimeFormat`). The previous UTC-based `toISOString().slice(0, 10)` flipped to the next day for Swiss users between 00:00 and 02:00 local time.
- `src/utils/errors.ts`: the network-error detector now matches `"network"` and `"fetch failed"` case-insensitively (Node error codes `ECONN*`, `ETIMEDOUT`, `ENOTFOUND` remain literal).
- `SlidingWindowRateLimiter`: validates `maxRequests > 0` and `windowMs > 0` (both finite) at construction to catch typos instead of silently scheduling NaN timers. The pending timer handle is `.unref()`-ed so a short-lived Node process is not kept alive by an idle rate-limit timer.
- `SimapClient` debug log: response size is now computed with `Buffer.byteLength` for accurate UTF-8 byte count (was `.length` on the decoded string).

### Security

- Upgraded `hono` to resolve [GHSA-458j-xx4x-4375](https://github.com/advisories/GHSA-458j-xx4x-4375).

### Documentation

- Added [CHANGELOG.md](./CHANGELOG.md) (this file).
- Expanded [SECURITY.md](./SECURITY.md) with a "Production Deployment Guidance" section and a "Debug Mode" section.
- Added a "Parameter Mapping" and "Error Handling" section to [ARCHITECTURE.md](./ARCHITECTURE.md).
- Refreshed [CLAUDE.md](./CLAUDE.md) to match the current source layout (rate limiter, error helper, exported schemas), document Conventional Commits, TypeScript strict-mode / no-`any` rule, and Keep a Changelog usage.

## [1.0.10] - Previously released

See the [GitHub Releases page](https://github.com/Digilac/simap-mcp/releases) for pre-1.1.0 history.
