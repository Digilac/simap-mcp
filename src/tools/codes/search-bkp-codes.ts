/**
 * Tool: search_bkp_codes
 * Search BKP (Baukostenplan) codes for construction projects.
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
 * Schema for search_bkp_codes parameters.
 */
export const searchBkpCodesInputSchema = z.object({
  query: z.string().min(1).max(500).describe("Search term (keyword or code number)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
});
export type SearchBkpCodesInput = z.infer<typeof searchBkpCodesInputSchema>;

/**
 * Handler for search_bkp_codes.
 */
async function handler(params: SearchBkpCodesInput) {
  const { query, lang } = params;

  try {
    const data = await simap.get<CodeSearchResponse>(ENDPOINTS.BKP_SEARCH, {
      params: {
        query,
        language: lang,
      },
      schema: CodeSearchResponseSchema,
    });

    if (!data.codes || data.codes.length === 0) {
      return `No BKP codes found for ${formatInlineCode(query)}.`;
    }

    let result = `# BKP Codes for ${formatInlineCode(query)}\n\n`;
    result += `${data.codes.length} result(s) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*Use these codes with the bkpCodes parameter of search_tenders.*`;

    return result;
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_bkp_codes",
      action: "searching BKP codes",
    });
  }
}

/**
 * Registers the search_bkp_codes tool.
 */
export function registerSearchBkpCodes(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_bkp_codes",
      description: "Search BKP (Swiss construction cost plan) codes by keyword or number",
      input: searchBkpCodesInputSchema,
    },
    handler
  );
}
