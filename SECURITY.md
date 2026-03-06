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

This project is an MCP server that acts as a read-only client to the public SIMAP API. It does not handle authentication, store credentials, or process sensitive user data.

Relevant concerns include:
- Dependency vulnerabilities
- Input validation issues
- Unexpected data exposure through tool outputs

## Best Practices for Users

- Keep the package updated to the latest version
- Run the server in a sandboxed environment when possible
- Review tool outputs before acting on them
