/**
 * Tool: search_npk_codes
 * Search NPK (Normpositionen-Katalog) codes.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeSearchResponse } from "../../types/api.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for search_npk_codes parameters.
 */
const schema = {
  query: z.string().min(1).describe("Search term (keyword or code number)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
};

/**
 * Handler for search_npk_codes.
 */
async function handler(params: { query: string; lang: Language }) {
  const { query, lang } = params;

  try {
    const data = await simap.get<CodeSearchResponse>(ENDPOINTS.NPK_SEARCH, {
      params: {
        query,
        language: lang,
      },
    });

    if (!data.codes || data.codes.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No NPK codes found for "${query}".`,
          },
        ],
      };
    }

    let result = `# NPK Codes for "${query}"\n\n`;
    result += `${data.codes.length} result(s) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*NPK codes are used for standardized positions in construction tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `NPK search error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the search_npk_codes tool.
 */
export function registerSearchNpkCodes(server: McpServer): void {
  server.tool(
    "search_npk_codes",
    "Search NPK (standardized positions catalog) codes by keyword or number",
    schema,
    handler
  );
}
