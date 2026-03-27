/**
 * Tool: browse_bkp_tree
 * Browse BKP (Baukostenplan) code hierarchy.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeEntry, CodeSearchResponse } from "../../types/api.js";
import { CodeTreeResponseSchema } from "../../types/schemas.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for browse_bkp_tree parameters.
 */
const schema = {
  parentCode: z
    .string()
    .regex(/^[0-9]{1,3}(\.[0-9])?$/)
    .optional()
    .describe("Parent BKP code. If omitted, shows root categories"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Display language"),
};

/**
 * Check if a code entry has children (nested codes).
 */
function hasChildren(item: CodeEntry & { codes?: CodeEntry[] | null }): boolean {
  return !!(item.codes && item.codes.length > 0);
}

/**
 * Handler for browse_bkp_tree.
 */
async function handler(params: { parentCode?: string; lang: Language }) {
  const { parentCode, lang } = params;

  try {
    const queryParams: Record<string, string> = {};
    if (parentCode) {
      queryParams.parentCode = parentCode;
    }

    const data = await simap.get<
      CodeSearchResponse & { codes: (CodeEntry & { codes?: CodeEntry[] | null })[] }
    >(ENDPOINTS.BKP_LIST, { params: queryParams, schema: CodeTreeResponseSchema });

    if (!data.codes || data.codes.length === 0) {
      const message = parentCode
        ? `No BKP subcategories found for code \`${parentCode}\`.`
        : `No root BKP categories found.`;
      return {
        content: [
          {
            type: "text" as const,
            text: message,
          },
        ],
      };
    }

    let result = parentCode
      ? `# BKP Subcategories of \`${parentCode}\`\n\n`
      : `# Root BKP Categories\n\n`;

    result += `${data.codes.length} category(ies) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      const hasSubcodes = hasChildren(item);
      result += `- **${item.code}** - ${label}${hasSubcodes ? " 📂" : ""}\n`;
    }

    result += `\n*Use browse_bkp_tree with a parent code to see its subcategories.*`;
    result += `\n*Use these codes with the bkpCodes parameter of search_tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    console.error("browse_bkp_tree error:", error);
    return {
      content: [
        {
          type: "text" as const,
          text: "An error occurred while browsing BKP codes. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the browse_bkp_tree tool.
 */
export function registerBrowseBkpTree(server: McpServer): void {
  server.tool(
    "browse_bkp_tree",
    "Browse the BKP code hierarchy (Swiss construction cost plan)",
    schema,
    handler
  );
}
