/**
 * Tool: search_npk_codes
 * Search NPK (Normpositionen-Katalog) codes.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeSearchResponse } from "../../types/api.js";
import { CodeSearchResponseSchema } from "../../types/schemas.js";
import { getTranslation } from "../../utils/translation.js";
import { formatInlineCode } from "../../utils/formatting.js";
import { toToolErrorResult } from "../../utils/errors.js";
import { registerTool } from "../../utils/register-tool.js";

/**
 * Schema for search_npk_codes parameters.
 */
export const searchNpkCodesInputSchema = z.object({
  query: z.string().min(1).max(500).describe("Search term (keyword or code number)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
});
export type SearchNpkCodesInput = z.infer<typeof searchNpkCodesInputSchema>;

/**
 * Handler for search_npk_codes.
 */
async function handler(params: SearchNpkCodesInput) {
  const { query, lang } = params;

  try {
    const data = await simap.get<CodeSearchResponse>(ENDPOINTS.NPK_SEARCH, {
      params: {
        query,
        language: lang,
      },
      schema: CodeSearchResponseSchema,
    });

    if (!data.codes || data.codes.length === 0) {
      return `No NPK codes found for ${formatInlineCode(query)}.`;
    }

    let result = `# NPK Codes for ${formatInlineCode(query)}\n\n`;
    result += `${data.codes.length} result(s) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*NPK codes are used for standardized positions in construction tenders.*`;

    return result;
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_npk_codes",
      action: "searching NPK codes",
    });
  }
}

/**
 * Registers the search_npk_codes tool.
 */
export function registerSearchNpkCodes(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_npk_codes",
      description:
        "Search NPK (standardized positions catalog) codes by keyword or number",
      input: searchNpkCodesInputSchema,
    },
    handler
  );
}
