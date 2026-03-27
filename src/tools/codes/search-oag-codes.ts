/**
 * Tool: search_oag_codes
 * Search OAG (Objektartengliederung) codes.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeSearchResponse } from "../../types/api.js";
import { CodeSearchResponseSchema } from "../../types/schemas.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for search_oag_codes parameters.
 */
const schema = {
  query: z.string().min(1).max(500).describe("Search term (keyword or code number)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
};

/**
 * Handler for search_oag_codes.
 */
async function handler(params: { query: string; lang: Language }) {
  const { query, lang } = params;

  try {
    const data = await simap.get<CodeSearchResponse>(ENDPOINTS.OAG_SEARCH, {
      params: {
        query,
        language: lang,
      },
      schema: CodeSearchResponseSchema,
    });

    if (!data.codes || data.codes.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No OAG codes found for \`${query}\`.`,
          },
        ],
      };
    }

    let result = `# OAG Codes for \`${query}\`\n\n`;
    result += `${data.codes.length} result(s) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*OAG codes classify objects by type in construction projects.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    console.error("search_oag_codes error:", error);
    return {
      content: [
        {
          type: "text" as const,
          text: "An error occurred while searching OAG codes. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the search_oag_codes tool.
 */
export function registerSearchOagCodes(server: McpServer): void {
  server.tool(
    "search_oag_codes",
    "Search OAG (object type classification) codes by keyword or number",
    schema,
    handler
  );
}
