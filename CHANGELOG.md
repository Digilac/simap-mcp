# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Documentation

- Added [CHANGELOG.md](./CHANGELOG.md) (this file).
- Expanded [SECURITY.md](./SECURITY.md) with a "Production Deployment Guidance" section and a "Debug Mode" section.
- Added a "Parameter Mapping" and "Error Handling" section to [ARCHITECTURE.md](./ARCHITECTURE.md).

## [1.0.10] - Previously released

See the [GitHub Releases page](https://github.com/Digilac/simap-mcp/releases) for pre-1.1.0 history.
