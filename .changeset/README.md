# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets). Add a changeset on any PR that produces a user-visible change — it becomes the line in `CHANGELOG.md` and the GitHub Release. The [changeset-bot](https://github.com/apps/changeset-bot) comments on each PR with the current status.

## Adding a changeset

```bash
npx changeset
```

The CLI asks:

1. **Bump level** — `patch` (bug fix, doc, internal change), `minor` (new tool / new feature), or `major` (breaking change).
2. **Summary** — one or two sentences. This becomes the bullet in `CHANGELOG.md` and in the GitHub Release. Lead with the affected symbol/file in backticks; favor the "what" and the "why".

The CLI writes a file like `.changeset/quiet-foxes-spin.md`. Commit it with the rest of your change.

## What happens next

When your PR is merged into `main`:

- The `release.yml` workflow opens (or updates) a **Version Packages** PR that bumps `package.json` + `server.json`, refreshes `package-lock.json`, and consumes pending changesets into `CHANGELOG.md`.
- When the maintainer merges that PR, `changesets/action` publishes to npm, creates the git tag and the GitHub Release (with `Thanks @you!` credit), then `mcp-publisher` publishes to the MCP Registry.

## Dependabot PRs

Dependabot does not add changesets. If a dependency bump is worth surfacing in the changelog, the maintainer adds a changeset on top of the Dependabot PR before merging.
