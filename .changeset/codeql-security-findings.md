---
"@digilac/simap-mcp": patch
---

`src/utils/formatting.ts` — `escapeInlineCode()` now escapes backslashes before backticks. Without this, an input like `` \` `` would render as `` \\` `` in tool output, where Markdown reads the doubled backslash as a literal `\` and the trailing backtick re-emerges un-escaped — flagged by CodeQL (`js/incomplete-sanitization`). User-visible only for tool-output strings that contain literal backslashes (terms notes, criteria notes, award decision notes).

`.github/workflows/ci.yml` — add an explicit `permissions: contents: read` block at workflow level so the `GITHUB_TOKEN` follows least privilege regardless of the repository default, matching `release.yml`. Resolves CodeQL `actions/missing-workflow-permissions`.

`tests/tools/search-cpv-codes.test.ts` — drop the local copy of `escapeInlineCode` and import the real one from `src/utils/formatting.ts`, so the test can no longer drift from the production implementation. `tests/utils/formatting.test.ts` gains direct unit coverage for `escapeInlineCode` (backticks, backslashes, the combined case, and newline collapsing).
