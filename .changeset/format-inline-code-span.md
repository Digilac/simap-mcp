---
"@digilac/simap-mcp": patch
---

`src/utils/formatting.ts` — add `formatInlineCode()` that wraps user input in a CommonMark-safe inline code span: it picks a backtick fence one longer than the longest backtick run in the input, and pads with a space when the content starts or ends with a backtick (CommonMark §6.1). The previous helper `escapeInlineCode()` only escaped backticks with backslashes, which CommonMark treats as literal inside code spans — so a single backtick in user input would still terminate the span and break the rendering of the surrounding tool output.

`src/tools/codes/search-cpv-codes.ts`, `src/tools/codes/search-bkp-codes.ts`, `src/tools/codes/search-npk-codes.ts`, `src/tools/codes/search-oag-codes.ts`, `src/tools/organizations/search-proc-offices.ts`, `src/tools/organizations/list-institutions.ts` — switch the headline + empty-results lines from `` `${escapeInlineCode(query)}` `` to `formatInlineCode(query)`. Output is unchanged for backtick-free queries; queries containing backticks now render as a proper inline code span instead of a broken one.

`escapeInlineCode()` is kept (used by `formatPublicationDetails` for prose context — it works correctly there) and its docstring now points readers to `formatInlineCode()` for code-span use.
