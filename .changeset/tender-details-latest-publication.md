---
"@digilac/simap-mcp": minor
---

`get_tender_details`: `publicationId` is now optional. Without it, the tool loads the project's latest publication, so a tender can be opened from its simap.ch link, which only contains the project ID. The output now also shows the latest publication's ID, which `get_publication_history` needs.
