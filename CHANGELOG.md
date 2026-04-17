# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
