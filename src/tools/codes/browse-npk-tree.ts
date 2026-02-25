/**
 * Tool: browse_npk_tree
 * Browse NPK (Normpositionen-Katalog) code hierarchy.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CodeEntry, CodeSearchResponse } from "../../types/api.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for browse_npk_tree parameters.
 */
const schema = {
  parentCode: z
    .string()
    .optional()
    .describe("Parent NPK code. If omitted, shows root categories"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Display language"),
};

/**
 * Check if a code entry has children (nested codes).
 */
function hasChildren(item: CodeEntry & { codes?: CodeEntry[] }): boolean {
  return !!(item.codes && item.codes.length > 0);
}

/**
 * Handler for browse_npk_tree.
 */
async function handler(params: { parentCode?: string; lang: Language }) {
  const { parentCode, lang } = params;

  try {
    const queryParams: Record<string, string> = {};
    if (parentCode) {
      queryParams.parentCode = parentCode;
    }

    const data = await simap.get<
      CodeSearchResponse & { codes: (CodeEntry & { codes?: CodeEntry[] })[] }
    >(ENDPOINTS.NPK_LIST, { params: queryParams });

    if (!data.codes || data.codes.length === 0) {
      const message = parentCode
        ? `No NPK subcategories found for code ${parentCode}.`
        : `No root NPK categories found.`;
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
      ? `# NPK Subcategories of ${parentCode}\n\n`
      : `# Root NPK Categories\n\n`;

    result += `${data.codes.length} category(ies) found.\n\n`;

    for (const item of data.codes) {
      const label = getTranslation(item.label, lang);
      const hasSubcodes = hasChildren(item);
      result += `- **${item.code}** - ${label}${hasSubcodes ? " 📂" : ""}\n`;
    }

    result += `\n*Use browse_npk_tree with a parent code to see its subcategories.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `NPK navigation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the browse_npk_tree tool.
 */
export function registerBrowseNpkTree(server: McpServer): void {
  server.tool(
    "browse_npk_tree",
    "Browse the NPK code hierarchy (standardized positions catalog)",
    schema,
    handler
  );
}
