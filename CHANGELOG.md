# Changelog

## 1.2.4

### Patch Changes

- [#39](https://github.com/Digilac/simap-mcp/pull/39) [`70bef7e`](https://github.com/Digilac/simap-mcp/commit/70bef7ec02793fc7f9029f100768f30345a61a58) Thanks [@dependabot](https://github.com/apps/dependabot)! - `zod` — bump from 4.3.6 to 4.4.1. The 4.4.0 minor includes correctness fixes around tuple parsing (defaults, optional tails, explicit `undefined`), and 4.4.1 tightens tuple-hole rejection. No tuple schemas in this codebase, so behavior is unchanged for consumers.

## 1.2.3

### Patch Changes

- [#33](https://github.com/Digilac/simap-mcp/pull/33) [`ebf3a37`](https://github.com/Digilac/simap-mcp/commit/ebf3a3764945c88dddc0db1fa991ee00927f716c) Thanks [@mathieumaf](https://github.com/mathieumaf)! - `src/utils/formatting.ts` — `escapeInlineCode()` now escapes backslashes before backticks. Without this, an input like `` \` `` would render as `` \\` `` in tool output, where Markdown reads the doubled backslash as a literal `\` and the trailing backtick re-emerges un-escaped — flagged by CodeQL (`js/incomplete-sanitization`). User-visible only for tool-output strings that contain literal backslashes (terms notes, criteria notes, award decision notes).

  `.github/workflows/ci.yml` — add an explicit `permissions: contents: read` block at workflow level so the `GITHUB_TOKEN` follows least privilege regardless of the repository default, matching `release.yml`. Resolves CodeQL `actions/missing-workflow-permissions`.

  `tests/tools/search-cpv-codes.test.ts` — drop the local copy of `escapeInlineCode` and import the real one from `src/utils/formatting.ts`, so the test can no longer drift from the production implementation. `tests/utils/formatting.test.ts` gains direct unit coverage for `escapeInlineCode` (backticks, backslashes, the combined case, and newline collapsing).

- [#35](https://github.com/Digilac/simap-mcp/pull/35) [`2b6fce2`](https://github.com/Digilac/simap-mcp/commit/2b6fce2f31a83a50b8176acfdaea7da5caebdafa) Thanks [@mathieumaf](https://github.com/mathieumaf)! - `src/utils/formatting.ts` — add `formatInlineCode()` that wraps user input in a CommonMark-safe inline code span: it picks a backtick fence one longer than the longest backtick run in the input, and pads with a space when the content starts or ends with a backtick (CommonMark §6.1). The previous helper `escapeInlineCode()` only escaped backticks with backslashes, which CommonMark treats as literal inside code spans — so a single backtick in user input would still terminate the span and break the rendering of the surrounding tool output.

  `src/tools/codes/search-cpv-codes.ts`, `src/tools/codes/search-bkp-codes.ts`, `src/tools/codes/search-npk-codes.ts`, `src/tools/codes/search-oag-codes.ts`, `src/tools/organizations/search-proc-offices.ts`, `src/tools/organizations/list-institutions.ts` — switch the headline + empty-results lines from `` `${escapeInlineCode(query)}` `` to `formatInlineCode(query)`. Output is unchanged for backtick-free queries; queries containing backticks now render as a proper inline code span instead of a broken one.

  `escapeInlineCode()` is kept (used by `formatPublicationDetails` for prose context — it works correctly there) and its docstring now points readers to `formatInlineCode()` for code-span use.

## 1.2.2

### Patch Changes

- [#32](https://github.com/Digilac/simap-mcp/pull/32) [`d4c3516`](https://github.com/Digilac/simap-mcp/commit/d4c351602903f455f41c050f83ae61890ba89590) Thanks [@mathieumaf](https://github.com/mathieumaf)! - `README.md` — fix the broken "GitHub Actions Workflow Status" badge: it pointed at the deleted `publish.yml` (replaced by `release.yml` in the changesets migration). Now points at `ci.yml` on `main`, which is the more accurate signal of project health.

- [#27](https://github.com/Digilac/simap-mcp/pull/27) [`a0e2eec`](https://github.com/Digilac/simap-mcp/commit/a0e2eecd05e3613550833753eb6661902fe3d603) Thanks [@mathieumaf](https://github.com/mathieumaf)! - Release flow now driven by [changesets](https://github.com/changesets/changesets): `package.json` and `server.json` are bumped together, `CHANGELOG.md` and the GitHub Release are generated from `.changeset/*.md` files (with PR-author credit), and publishing to npm + the MCP Registry runs from a single workflow. No change to install or usage for consumers.

- [#29](https://github.com/Digilac/simap-mcp/pull/29) [`8bff80c`](https://github.com/Digilac/simap-mcp/commit/8bff80c67a516a9624bd939edd06ccbeed9f705c) Thanks [@mathieumaf](https://github.com/mathieumaf)! - Changesets are now opt-in: contributors add one only when their PR produces a user-visible change. The CI changeset gate is removed; the [changeset-bot](https://github.com/apps/changeset-bot) still comments on every PR with the current status. Dependabot PRs no longer need an admin override to merge.

## [1.2.1] - 2026-04-23

### Changed

- `src/utils/errors.ts`, `src/utils/formatting.ts`, `src/tools/search-tenders.ts`, `src/tools/organizations/get-publication-history.ts`, `src/server.ts` — lowercase "simap" in all user-facing strings: 4xx/5xx/404 error messages, `simap Link:` / `simap URL:` / `simap Search Results` labels, the `search_tenders` tool description, and the stdio startup log. Test assertions in `tests/utils/errors.test.ts` updated to match. Keeps runtime output consistent with the brand style used in the docs.
- `package.json`, `server.json` — package/MCP-registry `description` uses lowercase "simap.ch".

### Removed

- `simap.yaml` — 809 KB orphan copy of the simap.ch OpenAPI spec that was not referenced from any source, test, or build step. Live documentation remains at <https://www.simap.ch/api-doc/>.

### Fixed

- `ARCHITECTURE.md` — Parameter Mapping table: the `cantons` Transform cell now reads `skip empty array` instead of the stale `.toUpperCase() on each` claim. The Zod schema (`z.enum(SWISS_CANTONS)`) already rejects non-uppercase input, so `buildTenderSearchQuery` never performed a `.toUpperCase()`. Doc has been stale since commit `b57fa58`.
- `ProjectHeaderSchema` and `LotEntrySchema`: `lotTitle` is now `.nullish()` — the SIMAP API can return lots with `lotTitle` absent (e.g. project 29058), which caused a Zod validation error in `get_tender_details` ([#22](https://github.com/Digilac/simap-mcp/pull/22)).

### Documentation

- `README.md` — restructured for clarity: added a **Prerequisites** section (Node.js ≥ 20); added per-client configuration blocks with Claude Desktop visible by default and the others (Claude Code, Cursor, VS Code, Windsurf, Cline, Zed) in collapsible `<details>` dropdowns; removed the duplicated **Development** and **Project Structure** sections (now link to `CONTRIBUTING.md` and `ARCHITECTURE.md`); removed the LobeHub badge.
- `README.md` — added an "in simap" hint to the Usage examples to make sure assistants route the request through the MCP server.
- `ARCHITECTURE.md` — moved the full tool-parameter reference here (new **Tools Reference** section) from the README, so the README stays focused on installation/usage and ARCHITECTURE.md holds both the HTTP endpoint map and the tool surface.
- `ARCHITECTURE.md` — added the `text` language identifier to the Swiss Cantons fenced code block (markdownlint MD040).
- `*.md` and `src/**/*.ts` — normalized the brand to lowercase "simap" in prose and JSDoc comments (code identifiers like `SIMAP_API_BASE`, `SIMAP_MCP_DEBUG`, `SimapClient`, `SimapApiError` are unchanged).

## [1.2.0] - 2026-04-22

### Added

- `get_tender_details`: new `fullRaw` boolean parameter (default `false`). When `true`, the full unmodified publication-details JSON is appended under a `### Full Raw Response` section.

### Changed

- `get_tender_details`: structured Markdown output now reads the real simap response shape (`base`, `dates`, `terms`, `criteria`, `procurement.cpvCode`, `publishers`, `decision`). Previous version read keys that do not exist in the API (`deadlines.*`, `contact.*`, `decision.awardees`), so sections like Deadlines / Conditions / CPV were silently empty. **Breaking** for any consumer that parsed the previous `### Raw Data (excerpt)` block — that section is gone (use `fullRaw: true` for the equivalent JSON).
- `PublicationDetailsSchema` (`src/types/schemas.ts`) and `PublicationDetails` (`src/types/api.ts`) rewritten on the real API keys. Still `.passthrough()` so unknown fields are preserved for `fullRaw`.
- Dev dependencies bumped: `eslint` 10.2.0 → 10.2.1, `typescript` 6.0.2 → 6.0.3, `typescript-eslint` 8.58.2 → 8.59.0, `vitest` 4.1.4 → 4.1.5.

### Removed

- `formatJsonPreview` helper (`src/utils/formatting.ts`). It truncated at 3000 characters, silently dropping ~76% of a typical publication-details response. `get_tender_details` now renders structured fields for the default view and `JSON.stringify(details, null, 2)` verbatim for the `fullRaw` view.

### Fixed

- `get_tender_details`: the 3000-character truncation that clipped most of the useful tender data (deadlines, criteria, conditions, award) is gone.
- `formatPublicationDetails` (`src/utils/formatting.ts`): CPV selection prefers `base.cpvCode` only when it carries a `.code`, so a partial `base.cpvCode` (label only) no longer masks a valid `procurement.cpvCode`.
- `formatPublicationDetails`: Conditions section now includes `terms.termsType` (e.g. `"in_documents"`); previously this populated simap field was dropped.
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

- `search_tenders` parameter mapping refactored into a dedicated helper (`src/tools/search-tenders-params.ts`). The user→simap API parameter mapping is now documented in [ARCHITECTURE.md](./ARCHITECTURE.md).
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
