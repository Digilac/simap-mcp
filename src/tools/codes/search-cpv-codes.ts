/**
 * Tool: search_cpv_codes
 * Search CPV (Common Procurement Vocabulary) codes.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CPVCode, CPVSearchResponse } from "../../types/api.js";
import { CPVSearchResponseSchema } from "../../types/schemas.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for search_cpv_codes parameters.
 */
const schema = {
  query: z.string().min(1).max(500).describe("Search term (keyword or code prefix)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
};

/**
 * Flattens nested CPV codes structure into a flat array.
 */
function flattenCodes(codes: CPVCode[], result: CPVCode[] = []): CPVCode[] {
  for (const code of codes) {
    result.push(code);
    if (code.codes && code.codes.length > 0) {
      flattenCodes(code.codes, result);
    }
  }
  return result;
}

/**
 * Handler for search_cpv_codes.
 */
async function handler(params: { query: string; lang: Language }) {
  const { query, lang } = params;

  try {
    const data = await simap.get<CPVSearchResponse>(ENDPOINTS.CPV_SEARCH, {
      params: {
        query,
        language: lang,
      },
      schema: CPVSearchResponseSchema,
    });

    if (!data.codes || data.codes.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No CPV codes found for \`${query}\`.`,
          },
        ],
      };
    }

    // Flatten nested structure
    const flatCodes = flattenCodes(data.codes);

    let result = `# CPV Codes for \`${query}\`\n\n`;
    result += `${flatCodes.length} result(s) found.\n\n`;

    for (const item of flatCodes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*Use these codes with the cpvCodes parameter of search_tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    console.error("search_cpv_codes error:", error);
    return {
      content: [
        {
          type: "text" as const,
          text: "An error occurred while searching CPV codes. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the search_cpv_codes tool.
 */
export function registerSearchCpvCodes(server: McpServer): void {
  server.tool(
    "search_cpv_codes",
    "Search CPV (Common Procurement Vocabulary) codes by keyword or partial code number",
    schema,
    handler
  );
}
