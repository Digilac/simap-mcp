---
"@digilac/simap-mcp": patch
---

`get_tender_details`: fix empty titles and missing dates in the "General Information" section. The project header schema read `title`, `lotTitle` and `publicationDate`, but simap returns the titles on the latest publication and on each lot (`title`) and the dates under `dates.publicationDate`, so the project title and lot titles were blank and dates showed `N/A` or `undefined`.
