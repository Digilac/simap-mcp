/**
 * Tool: browse_oag_tree
 * Browse OAG (Objektartengliederung) code hierarchy.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeEntry, CodeSearchResponse } from "../../types/api.js";
import { CodeTreeResponseSchema } from "../../types/schemas.js";
import { getTranslation } from "../../utils/translation.js";
import { toToolErrorResult } from "../../utils/errors.js";

/**
 * Schema (raw shape) for browse_oag_tree parameters.
 */
export const browseOagTreeInputShape = {
  parentCode: z
    .string()
    .regex(/^[0-9]{1,10}$/)
    .optional()
    .describe("Parent OAG code. If omitted, shows root categories"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Display language"),
} as const;

export const browseOagTreeInputSchema = z.object(browseOagTreeInputShape);
export type BrowseOagTreeInput = z.infer<typeof browseOagTreeInputSchema>;

/**
 * Check if a code entry has children (nested codes).
 */
function hasChildren(item: CodeEntry & { codes?: CodeEntry[] | null }): boolean {
  return !!(item.codes && item.codes.length > 0);
}

/**
 * Handler for browse_oag_tree.
 */
async function handler(params: BrowseOagTreeInput) {
  const { parentCode, lang } = params;

  try {
    const queryParams: Record<string, string> = {};
    if (parentCode) {
      queryParams.parentCode = parentCode;
    }

    const data = await simap.get<
      CodeSearchResponse & { codes: (CodeEntry & { codes?: CodeEntry[] | null })[] }
    >(ENDPOINTS.OAG_LIST, { params: queryParams, schema: CodeTreeResponseSchema });

    if (!data.codes || data.codes.length === 0) {
      const message = parentCode
        ? `No OAG subcategories found for code \`${parentCode}\`.`
        : `No root OAG categories found.`;
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
      ? `# OAG Subcategories of \`${parentCode}\`\n\n`
      : `# Root OAG Categories\n\n`;

    result += `${data.codes.length} category(ies) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      const hasSubcodes = hasChildren(item);
      result += `- **${item.code}** - ${label}${hasSubcodes ? " 📂" : ""}\n`;
    }

    result += `\n*Use browse_oag_tree with a parent code to see its subcategories.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "browse_oag_tree",
      action: "browsing OAG codes",
    });
  }
}

/**
 * Registers the browse_oag_tree tool.
 */
export function registerBrowseOagTree(server: McpServer): void {
  server.tool(
    "browse_oag_tree",
    "Browse the OAG code hierarchy (object type classification)",
    browseOagTreeInputShape,
    handler
  );
}
