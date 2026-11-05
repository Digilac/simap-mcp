---
"@digilac/simap-mcp": minor
---

`SimapClient`: retry transient simap failures (HTTP 408 / 429 / 5xx and network errors) up to 2 times with exponential backoff and jitter, honouring `Retry-After`, so a brief simap hiccup no longer surfaces as a tool error. Client errors, invalid responses and timeouts still fail immediately.
