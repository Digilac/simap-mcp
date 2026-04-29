---
"@digilac/simap-mcp": patch
---

Release flow now driven by [changesets](https://github.com/changesets/changesets): `package.json` and `server.json` are bumped together, `CHANGELOG.md` and the GitHub Release are generated from `.changeset/*.md` files (with PR-author credit), and publishing to npm + the MCP Registry runs from a single workflow. No change to install or usage for consumers.
