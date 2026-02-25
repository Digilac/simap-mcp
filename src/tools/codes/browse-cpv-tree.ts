/**
 * Tool: browse_cpv_tree
 * Browse CPV code hierarchy.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CPVCode, CPVSearchResponse } from "../../types/api.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for browse_cpv_tree parameters.
 */
const schema = {
  parentCode: z
    .string()
    .regex(/^[0-9]{8}$/)
    .optional()
    .describe("Parent code (8 digits). If omitted, shows root categories"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Display language"),
};

/**
 * Flattens nested CPV codes structure into a flat array (only first level children).
 */
function getDirectChildren(codes: CPVCode[]): CPVCode[] {
  return codes;
}

/**
 * Handler for browse_cpv_tree.
 */
async function handler(params: { parentCode?: string; lang: Language }) {
  const { parentCode, lang } = params;

  try {
    const queryParams: Record<string, string> = {};
    if (parentCode) {
      queryParams.parentCode = parentCode;
    }

    const data = await simap.get<CPVSearchResponse>(ENDPOINTS.CPV_LIST, {
      params: queryParams,
    });

    if (!data.codes || data.codes.length === 0) {
      const message = parentCode
        ? `No subcategories found for code ${parentCode}.`
        : `No root CPV categories found.`;
      return {
        content: [
          {
            type: "text" as const,
            text: message,
          },
        ],
      };
    }

    const codes = getDirectChildren(data.codes);

    let result = parentCode
      ? `# CPV Subcategories of ${parentCode}\n\n`
      : `# Root CPV Categories\n\n`;

    result += `${codes.length} category(ies) found.\n\n`;

    for (const item of codes) {
      const label = getTranslation(item.label, lang);
      const hasChildren = item.codes && item.codes.length > 0;
      result += `- **${item.code}** - ${label}${hasChildren ? " 📂" : ""}\n`;
    }

    result += `\n*Use browse_cpv_tree with a parent code to see its subcategories.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `CPV navigation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the browse_cpv_tree tool.
 */
export function registerBrowseCpvTree(server: McpServer): void {
  server.tool(
    "browse_cpv_tree",
    "Browse the CPV code hierarchy (shows subcategories of a parent code)",
    schema,
    handler
  );
}
