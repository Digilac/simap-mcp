# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public issue.**

Instead, please use [GitHub's private vulnerability reporting](https://github.com/Digilac/simap-mcp/security/advisories/new) to submit your report.

You can expect:

- An acknowledgment within 48 hours
- A follow-up with an assessment within 7 days
- A fix timeline based on severity

## Scope

This project is an MCP server that acts as a read-only client to the public simap API. It does not handle authentication, store credentials, or process sensitive user data.

The [threat model](./docs/security/threat-model.md) describes the assets, actors, entry points and trust boundaries behind the rules below.

Relevant concerns include:

- Dependency vulnerabilities
- Input validation issues
- Unexpected data exposure through tool outputs

## Security Invariants

A change that breaks one of these is a security change, whatever its size:

1. **stdio only.** The server never opens a network listener.
2. **One outbound target.** Every request is an HTTPS `GET` that starts at `https://www.simap.ch/api`. No tool argument or environment variable can change that address. Redirects are followed, so simap.ch itself can send a request elsewhere (a [known limit](./docs/security/threat-model.md#known-limits-and-accepted-risks)).
3. **No credentials.** It reads, stores and sends no API key, token or password.
4. **No local side effects.** It writes no file and starts no process. The only file it reads is its own `package.json`.
5. **stdout is the protocol.** Logs go to stderr. Query values (search terms, filters) are logged only under `SIMAP_MCP_DEBUG`. The default logs hold the endpoint path, which includes tender and publication IDs, and on failure the raw error, which can quote part of simap's response.
6. **User input is validated before use.** Tool arguments are parsed by Zod, and user-supplied IDs placed in a URL path are validated as UUIDs.
7. **Read-only tools.** Every tool only reads public data and is advertised with `readOnlyHint`.
8. **Releases come from `main`.** Only `.github/workflows/release.yml` publishes: to npm on a push to `main`, with provenance, and to the MCP Registry from `main` only (a manual run on any other branch is skipped). That nothing reaches `main` without a pull request and passing checks is a GitHub ruleset, configured outside this repository.

## What to Report

Report anything that breaks an invariant above. As a guide to severity:

- **High:** the server can be made to open a listener, start a request at a host other than simap.ch, write a file, run a command or handle a credential; or the release pipeline can be made to publish something that was not merged to `main`.
- **Medium:** query values reach the logs outside debug mode, user input reaches a URL path without validation, or the server can be made to use unbounded memory or requests.
- **Low:** incorrect or misleading tool output with no further consequence.

Known and accepted, so not reportable on their own (the [threat model](./docs/security/threat-model.md#known-limits-and-accepted-risks) has the full list):

- **Instructions hidden in tender text.** Tenders are third-party content and are passed to the model as they are. The tools are read-only, which limits what such text can make this server do. Report it if you find a way to make this server do more than read simap.
- **simap availability and data accuracy.** This project does not operate simap.ch.
- **Weaknesses of the MCP host** that runs the server.

### Published Skill

The server publishes one Skill (`simap-workflow`) through the MCP Skills extension, so it advertises the `io.modelcontextprotocol/skills` extension and lists `skill://simap-workflow/SKILL.md` and `skill://simap-workflow/_manifest` as resources. This adds no new data flow:

- The Skill is an in-memory snapshot built from constants in the source code. It does not read the filesystem, the network or any user input, and its content is the same for every client.
- Only those two URIs resolve. Any other URI, including `..` and percent-encoded traversal attempts, is answered with "Resource not found".
- Its text is instructions for the model, written by this project and reviewed like the `analyze_tender` prompt it shares its analysis with. Like the prompt, it only describes how to use the read-only tools.

## Best Practices for Users

- Keep the package updated to the latest version
- Run the server in a sandboxed environment when possible
- Review tool outputs before acting on them

## Production Deployment Guidance

- **Keep `SIMAP_MCP_DEBUG` unset (or set to an empty value) in production.** Debug mode logs the full request URL, including user-supplied search terms and filter values, to stderr. In most MCP hosts these stderr logs are captured and retained, so enabling debug in production effectively persists user queries.
- The server does not require any secrets, tokens, or API keys. Do not configure any — if you see an example asking you to set one, it is likely a phishing attempt.
- stdout is reserved for the MCP JSON-RPC protocol; never redirect it into log files.
- **The server is stdio-only and never opens a network listener.** It is built on FastMCP, whose `run()` honours an `MCP_TRANSPORT` environment variable that could otherwise switch it to an unauthenticated HTTP listener. `startServer()` explicitly forces `transport: "stdio"` and overrides any other `MCP_TRANSPORT` value (logging a warning to stderr), so a stray variable in the host environment cannot expose the server over HTTP. FastMCP's HTTP-related variables (`MCP_PORT`, `PORT`, `MCP_HOST`, `MCP_PATH`) are therefore without effect.

## Debug Mode

The `SIMAP_MCP_DEBUG` environment variable, when set to `1` or `true`, switches the HTTP client to verbose stderr logging:

- Full outbound URL (with all query parameters)
- Response status, byte size, and request duration

This is intended for local troubleshooting only. It is off by default precisely because the extra payload can contain user-intent data (search terms, CPV codes, canton filters) that should not leak into shared log infrastructure.
