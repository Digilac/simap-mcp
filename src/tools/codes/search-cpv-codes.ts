/**
 * Tool: search_cpv_codes
 * Search CPV (Common Procurement Vocabulary) codes.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CPVCode, CPVSearchResponse } from "../../types/api.js";
import { CPVSearchResponseSchema } from "../../types/schemas.js";
import { getTranslation } from "../../utils/translation.js";
import { formatInlineCode } from "../../utils/formatting.js";
import { toToolErrorResult } from "../../utils/errors.js";
import { registerTool } from "../../utils/register-tool.js";

/**
 * Schema for search_cpv_codes parameters.
 */
export const searchCpvCodesInputSchema = z.object({
  query: z.string().min(1).max(500).describe("Search term (keyword or code prefix)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
});
export type SearchCpvCodesInput = z.infer<typeof searchCpvCodesInputSchema>;

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
async function handler(params: SearchCpvCodesInput) {
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
      return `No CPV codes found for ${formatInlineCode(query)}.`;
    }

    // Flatten nested structure
    const flatCodes = flattenCodes(data.codes);

    let result = `# CPV Codes for ${formatInlineCode(query)}\n\n`;
    result += `${flatCodes.length} result(s) found.\n\n`;

    for (const item of flatCodes) {
      const label = getTranslation(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*Use these codes with the cpvCodes parameter of search_tenders.*`;

    return result;
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_cpv_codes",
      action: "searching CPV codes",
    });
  }
}

/**
 * Registers the search_cpv_codes tool.
 */
export function registerSearchCpvCodes(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_cpv_codes",
      description:
        "Search CPV (Common Procurement Vocabulary) codes by keyword or partial code number",
      input: searchCpvCodesInputSchema,
    },
    handler
  );
}
