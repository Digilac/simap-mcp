# Threat model

What simap-mcp is, what it touches, and where the trust boundaries are. Read it with [SECURITY.md](../../SECURITY.md), which holds the disclosure policy and the invariants that follow from this model.

Revisit this file when the transport, the outbound hosts, the data the server stores, or the release pipeline change.

## System and deployed scope

simap-mcp is a Node.js process that an MCP host (Claude Desktop, Claude Code, an editor) starts on the user's machine, usually with `npx -y @digilac/simap-mcp`. It speaks MCP over stdio to that host and makes HTTPS `GET` requests to the public simap API. It has no server-side deployment, no database and no accounts.

```
user ── MCP host + model ──stdio──> simap-mcp ──HTTPS GET──> www.simap.ch/api
          (trusted to launch)        (this repo)              (public, third party)
```

The package is published to npm and listed in the MCP Registry by `.github/workflows/release.yml`.

**Unverified assumptions.** The repository cannot establish how a host sandboxes the process, what the host does with stderr, or whether an operator wraps the server in a network-facing proxy. The model below assumes a local, single-user host. It also relies on settings held by GitHub and npm rather than by this repository: the ruleset on `main` and npm's trusted-publisher configuration (see boundary 4).

## Assets

| Asset                                                                      | Why it matters                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| The user's machine and the host process                                    | The server runs with the user's privileges.                           |
| The user's queries (search terms, cantons, codes, tender IDs)              | They reveal which tenders a company is considering.                   |
| The integrity of tool output                                               | The model acts on it; wrong or injected text misleads a bid decision. |
| The published package (`@digilac/simap-mcp` on npm) and its registry entry | Every user runs it, often unpinned through `npx -y`.                  |
| The release credentials (`RELEASE_PAT`, npm and registry OIDC trust)       | They can publish a new version.                                       |

The server holds no secrets of its own: it reads no API key, token or password.

## Actors

- **The user**, through the MCP host. Trusted.
- **The model** in the host. It chooses tool arguments, so its input is untrusted: it can be steered by text it has read, including earlier tool output.
- **simap.ch.** A third party. Its responses are untrusted in shape and in content.
- **Publishers of tenders on simap.** They write the free text (titles, descriptions, criteria) the server passes on. Untrusted.
- **Contributors and dependencies.** Pull requests and npm packages reach users through the release pipeline.
- **Maintainers with write access.** Trusted. They can push branches, edit the workflows and start them by hand, so no check inside a workflow file binds them: only settings held by GitHub and npm can (see boundary 4).
- **The host environment.** Environment variables are set by whoever configures the host.

## Entry points and untrusted input

| Entry point                                    | Code                                                                    | Handling                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool arguments (14 tools)                      | `src/utils/register-tool.ts`, each `*InputSchema` in `src/tools/**`     | Parsed by Zod before the handler runs. Invalid input returns an `isError` result.                                                                                                                                                                                                                                                                                                                                                |
| IDs placed in a URL path                       | `src/api/endpoints.ts`, `get_tender_details`, `get_publication_history` | IDs supplied by the user are validated as UUIDs by the input schema before interpolation. When `publicationId` is omitted, `get_tender_details` takes the ID from simap's project header, where it is only checked to be a string (see known limits).                                                                                                                                                                            |
| Query values                                   | `buildUrl()` in `src/api/client.ts`                                     | Encoded through `URLSearchParams`.                                                                                                                                                                                                                                                                                                                                                                                               |
| Prompt argument (`analyze_tender` URL)         | `src/prompts/analyze-tender.ts`                                         | The user who invokes the prompt supplies it. A project ID is taken from a simap link or, failing that, from the first UUID anywhere in the text; only when there is none is the text echoed into the prompt as search input. The prompt emits instructions and fetches nothing.                                                                                                                                                  |
| simap responses                                | `src/api/client.ts`, `src/types/schemas.ts`                             | JSON only, validated by Zod. A field a schema object does not list is dropped. Two groups of schema objects use `.passthrough()` and keep unknown fields instead: the publication details, which `get_tender_details` returns as parsed when `fullRaw` is set, and the order address in search results. Objects nested inside them that do not use `.passthrough()` still drop unknown fields. Neither behaviour fails the tool. |
| Environment variables                          | `src/server.ts`, `src/api/client.ts`                                    | The server's own code reads only `SIMAP_MCP_DEBUG` and `MCP_TRANSPORT`, and forces `MCP_TRANSPORT` back to `stdio`. FastMCP's HTTP variables therefore have no effect (see SECURITY.md).                                                                                                                                                                                                                                         |
| Skill resources (`skill://simap-workflow/...`) | `src/skills/**`                                                         | Built from constants in memory; no filesystem or network read.                                                                                                                                                                                                                                                                                                                                                                   |

## Trust boundaries

1. **Host ↔ server (stdio).** stdout is the JSON-RPC stream. Anything else written there breaks the protocol, so all logging goes to stderr.
2. **Server ↔ simap (HTTPS).** Every request starts at the constant `SIMAP_API_BASE`. No argument or environment variable can change where a request starts, and only `GET` is issued. `fetch` follows redirects with its default settings, so simap.ch itself can send a request to another address.
3. **simap content ↔ model.** Tender text is third-party content returned to the model as Markdown. The server escapes user input it echoes back, but it does not and cannot remove instructions hidden in a tender. Every tool is read-only and advertised as such (`readOnlyHint`), which bounds what an injected instruction can make this server do. What the host's other tools do with that text is outside this repository.
4. **Repository ↔ users (release).** Only `.github/workflows/release.yml` publishes. npm publication runs on a push to `main` and uses OIDC with provenance; the workflow passes no npm token. Registry publication runs from `main` only, including when the workflow is started by hand, and the publisher binary is verified with cosign before it runs. These `main`-only checks are in the workflow file itself, so they hold for anyone who cannot edit it. What constrains the maintainers who can is held outside this repository, which cannot show it:
   - The GitHub ruleset on `main` decides what a change needs before it lands: a pull request and passing checks.
   - npm's trusted-publisher configuration decides which repository and workflow file may publish the package. It does not restrict the branch. Tying npm publication to `main` would take a protected GitHub environment, named in that configuration and declared on the `release` job, which declares none today.
   - The MCP Registry accepts the publisher through GitHub OIDC for this repository. On that path the only `main` restriction is the check in the workflow.

## Sensitive data flows

- **Queries leave the machine** in HTTPS requests that start at `www.simap.ch` (see boundary 2 for redirects).
- **Queries reach the logs** only when `SIMAP_MCP_DEBUG` is set: the default log line is the endpoint path without its query string. Tender and publication IDs are part of that path. On failure the raw error is logged as well, and it can quote part of simap's response. Hosts often retain stderr.
- **Nothing is written to disk.** Reference data is cached in memory (`ResponseCache`, 500 entries, 24 hours) under its full URL, so the terms of a code search stay in the process's memory. 24 hours is how long an entry is reused, not how long it is kept: an expired entry is only removed when the same URL is requested again, when the cache is full and it is the least recently used, or when the process exits. Tenders are never cached.

## Privileged operations

There are none at runtime: no filesystem write, no child process, no listener, no credential. The only file read is the package's own `package.json`, for the version.

The privileged operations are in the release pipeline: publishing to npm, creating tags and GitHub Releases, and publishing to the MCP Registry.

## Known limits and accepted risks

- **Prompt injection through tender text** is not filtered (boundary 3). Accepted: the tools are read-only, and filtering free text would corrupt legitimate tenders.
- **Redirects are followed** (boundary 2). A redirect from simap.ch would take a request to another address, and simap could pass the query along by putting it in the redirect target. Accepted while simap.ch is the only upstream; refusing redirects in `src/api/client.ts` would close it.
- **IDs taken from simap responses are not validated** before they go into a URL path (`get_tender_details` without `publicationId`). They can only change the path of a request to simap, not its host.
- **Response size is not capped.** A very large simap response is parsed in full. Accepted while the only upstream is simap; the 30-second timeout and the rate limiter (60 requests per minute for each server process, retries included) bound the request rate, not the size.
- **`npx -y` runs the latest published version.** A compromised release reaches users on their next start. Mitigated by provenance, by pinned actions in the release workflow, and by the ruleset that requires a pull request and passing checks on `main` (a hosted setting); users who need more can pin a version.
