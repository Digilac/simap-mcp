---
"@digilac/simap-mcp": minor
---

- `package.json` `engines.node` — bumped from `>=20` to `>=22`. Node.js 20 reached end-of-life on 2026-04-30 and no longer receives security updates; supported runtimes are now Node 22 (Active LTS) and Node 24 (Current LTS).
- `.github/workflows/ci.yml` — CI matrix updated to `[22, 24]`. Documentation (`README.md`, `CONTRIBUTING.md`) updated to reflect the new minimum Node version.
