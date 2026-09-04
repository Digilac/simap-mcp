/**
 * Tool: search_oag_codes
 * Search OAG (Objektartengliederung) codes.
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
 * Schema for search_oag_codes parameters.
 */
export const searchOagCodesInputSchema = z.object({
  query: z.string().min(1).max(500).describe("Search term (keyword or code number)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
});
export type SearchOagCodesInput = z.infer<typeof searchOagCodesInputSchema>;

/**
 * Handler for search_oag_codes.
 */
async function handler(params: SearchOagCodesInput) {
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
      return `No OAG codes found for ${formatInlineCode(query)}.`;
    }

    let result = `# OAG Codes for ${formatInlineCode(query)}\n\n`;
    result += `${data.codes.length} result(s) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*OAG codes classify objects by type in construction projects.*`;

    return result;
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_oag_codes",
      action: "searching OAG codes",
    });
  }
}

/**
 * Registers the search_oag_codes tool.
 */
export function registerSearchOagCodes(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_oag_codes",
      description: "Search OAG (object type classification) codes by keyword or number",
      input: searchOagCodesInputSchema,
    },
    handler
  );
}
