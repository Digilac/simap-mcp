# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
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

Relevant concerns include:
- Dependency vulnerabilities
- Input validation issues
- Unexpected data exposure through tool outputs

## Best Practices for Users

- Keep the package updated to the latest version
- Run the server in a sandboxed environment when possible
- Review tool outputs before acting on them

## Production Deployment Guidance

- **Keep `SIMAP_MCP_DEBUG` unset (or set to an empty value) in production.** Debug mode logs the full request URL, including user-supplied search terms and filter values, to stderr. In most MCP hosts these stderr logs are captured and retained, so enabling debug in production effectively persists user queries.
- The server does not require any secrets, tokens, or API keys. Do not configure any — if you see an example asking you to set one, it is likely a phishing attempt.
- stdout is reserved for the MCP JSON-RPC protocol; never redirect it into log files.

## Debug Mode

The `SIMAP_MCP_DEBUG` environment variable, when set to `1` or `true`, switches the HTTP client to verbose stderr logging:

- Full outbound URL (with all query parameters)
- Response status, byte size, and request duration

This is intended for local troubleshooting only. It is off by default precisely because the extra payload can contain user-intent data (search terms, CPV codes, canton filters) that should not leak into shared log infrastructure.
