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

- Node.js 20+
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

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Build + run |
| `npm run lint` | Check code (ESLint) |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code (Prettier) |
| `npm run typecheck` | Check types |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

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

### 4. Add a Changeset

**Every PR must add a changeset** — the CI check enforces this.

```bash
npx changeset
```

The CLI prompts for a bump level (`patch` / `minor` / `major`) and a summary — start with the affected symbol/file in backticks. The resulting `.changeset/<name>.md` is committed with the rest of your change.

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

Each tool exports **three symbols** alongside the `register*()` function — the shape for `server.tool()`, the schema for tests, and the inferred input type:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { toToolErrorResult } from "../../utils/errors.js";

// Raw Zod shape — plain object, consumed by `server.tool()`.
export const searchXxxInputShape = {
  query: z.string().min(1).max(500).describe("Parameter description"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
} as const;

// Wrapped schema — used by tests via `.safeParse()` to avoid drift.
export const searchXxxInputSchema = z.object(searchXxxInputShape);
export type SearchXxxInput = z.infer<typeof searchXxxInputSchema>;

async function handler(params: SearchXxxInput) {
  try {
    const data = await simap.get(ENDPOINTS.XXX, {
      params: { query: params.query, language: params.lang },
      // schema: XxxResponseSchema,  // add a Zod response schema from types/schemas.ts
    });

    // Format and return
    return {
      content: [{ type: "text" as const, text: "..." }],
    };
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_xxx",
      action: "searching xxx",
    });
  }
}

export function registerSearchXxx(server: McpServer): void {
  server.tool("search_xxx", "Short description", searchXxxInputShape, handler);
}
```

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

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `search-cpv.ts` |
| Functions | camelCase | `registerSearchCpv` |
| Classes | PascalCase | `SimapClient` |
| Constants | UPPER_SNAKE | `SIMAP_API_BASE` |
| MCP Tools | snake_case | `search_cpv_codes` |

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
- [ ] Changeset added (`npx changeset`)
- [ ] Documentation updated if necessary
- [ ] Commits are clean and descriptive

## Questions?

- Open an [Issue](../../issues) for bugs or feature requests
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for code structure

Thank you for contributing!
