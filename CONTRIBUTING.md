# Contributing to simap MCP Server

Thank you for your interest in this project! This guide will help you contribute effectively.

## How to Contribute

### Reporting a Bug

1. Check that the bug hasn't already been reported in the [Issues](../../issues)
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and OS

### Proposing a Feature

1. Create an issue describing the use case
2. Mention the relevant simap API endpoint if applicable

### Contributing Code

1. Choose an existing issue or create one
2. Comment on the issue to indicate you're working on it
3. Follow the workflow below

## Environment Setup

### Prerequisites

- Node.js 22+
- npm
- Git

### Installation

```bash
git clone https://github.com/Digilac/simap-mcp.git
cd simap-mcp
npm install
npm run build
npm run lint
npm test
```

### Available Scripts

| Script                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `npm run build`        | Compile TypeScript                                        |
| `npm start`            | Run the built server (stdio)                              |
| `npm run dev`          | Recompile on every save (`tsc --watch`)                   |
| `npm run inspect`      | Open the MCP Inspector UI against the current build       |
| `npm run tools`        | List the tools + input schemas from the CLI (smoke check) |
| `npm run lint`         | Check code (ESLint)                                       |
| `npm run lint:fix`     | Auto-fix lint issues                                      |
| `npm run format`       | Format code (Prettier)                                    |
| `npm run format:check` | Check formatting (used in CI)                             |
| `npm run typecheck`    | Check types                                               |
| `npm test`             | Run tests                                                 |
| `npm run test:watch`   | Run tests in watch mode                                   |

## Development Workflow

### 1. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/simap-mcp.git
cd simap-mcp
git remote add upstream https://github.com/Digilac/simap-mcp.git
```

### 2. Create a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/my-feature
# or
git checkout -b fix/my-fix
```

### 3. Develop

- Follow the structure in [ARCHITECTURE.md](./ARCHITECTURE.md)
- Write tests for your code
- Commit regularly with clear messages

The server speaks MCP over stdio, so running it alone in a terminal is not useful — it just waits for JSON-RPC on stdin. The practical loop is two terminals:

```bash
npm run dev       # terminal 1: recompiles dist/ on every save
npm run inspect   # terminal 2: MCP Inspector UI; it respawns the server on each connection, so it always runs the latest build
```

For a quick check without the UI, `npm run tools` prints every tool with its input schema, and `fastmcp call` invokes one directly against the build:

```bash
npx fastmcp call --file dist/server.js:createServer search_cpv_codes query=software lang=fr
```

### 4. Add a Changeset

If your change is user-visible (new tool, behavior change, bug fix, public-facing doc), run:

```bash
npx changeset
```

Pick `patch` / `minor` / `major` and write a one-or-two-sentence summary — start with the affected symbol/file in backticks. The resulting `.changeset/<name>.md` is committed with the rest of your change. Internal-only changes (tests, CI tweaks, refactors with no user-visible effect) don't need one.

See [`.changeset/README.md`](./.changeset/README.md) for the full guide.

### 5. Verify Before Pushing

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

### 6. Push and Open a PR

```bash
git push origin feature/my-feature
```

Then open a Pull Request from your fork to the `main` branch of `Digilac/simap-mcp`.

## Adding a New Tool

### 1. Create the Tool File

```bash
# For a nomenclature tool
touch src/tools/codes/search-xxx.ts

# For an organization tool
touch src/tools/organizations/xxx.ts
```

### 2. Follow the Tool Pattern

Each tool exports **two symbols** alongside the `register*()` function — the input schema and the inferred input type:

```typescript
import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { toToolErrorResult } from "../../utils/errors.js";
import { registerTool } from "../../utils/register-tool.js";

// Input schema — passed as the tool `input` and used by tests via `.safeParse()`.
export const searchXxxInputSchema = z.object({
  query: z.string().min(1).max(500).describe("Parameter description"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
});
export type SearchXxxInput = z.infer<typeof searchXxxInputSchema>;

async function handler(params: SearchXxxInput) {
  try {
    const data = await simap.get(ENDPOINTS.XXX, {
      params: { query: params.query, language: params.lang },
      // schema: XxxResponseSchema,  // add a Zod response schema from types/schemas.ts
    });

    // Format and return the Markdown text — FastMCP converts it to a text content block
    return "...";
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_xxx",
      action: "searching xxx",
    });
  }
}

export function registerSearchXxx(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_xxx",
      description: "Short description",
      input: searchXxxInputSchema,
    },
    handler
  );
}
```

Always go through `registerTool()` rather than `server.tool()`: it advertises the JSON Schema in input mode (defaulted fields stay optional) and turns invalid arguments into an `isError` tool result with field paths (see [ARCHITECTURE.md](./ARCHITECTURE.md#tool-registration)). For user-facing errors, return `toolErrorResult(text)` / `toToolErrorResult(error, ctx)` — do not `throw`.

### 3. Register It

Add the import and call in the appropriate `index.ts` (e.g., `src/tools/codes/index.ts`).

### 4. Add the Endpoint

In `src/api/endpoints.ts`, add the new endpoint constant.

### 5. Write Tests

In `tests/tools/`, create a matching test file.

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` (use `unknown` if necessary)
- Explicit types for public function parameters

### Naming

| Element   | Convention  | Example             |
| --------- | ----------- | ------------------- |
| Files     | kebab-case  | `search-cpv.ts`     |
| Functions | camelCase   | `registerSearchCpv` |
| Classes   | PascalCase  | `SimapClient`       |
| Constants | UPPER_SNAKE | `SIMAP_API_BASE`    |
| MCP Tools | snake_case  | `search_cpv_codes`  |

### Formatting

- 2 spaces indentation
- Semicolons required
- Double quotes
- Trailing comma (ES5)

Run `npm run format` before committing.

### Commits

```
type(scope): short description
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:

```
feat(tools): add search_xxx tool
fix(api): handle timeout errors properly
docs: update README
```

## Submitting a Pull Request

### Checklist

- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Changeset added if the change is user-visible (`npx changeset`)
- [ ] Documentation updated if necessary
- [ ] Commits are clean and descriptive

## Questions?

- Open an [Issue](../../issues) for bugs or feature requests
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for code structure

Thank you for contributing!
