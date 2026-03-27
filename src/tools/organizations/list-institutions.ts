/**
 * Tool: list_institutions
 * List public institutions that publish tenders.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { InstitutionsResponse, Institution } from "../../types/api.js";
import { InstitutionsResponseSchema } from "../../types/schemas.js";
import type { Language } from "../../types/common.js";
import { getTranslation } from "../../utils/translation.js";

/**
 * Schema for list_institutions parameters.
 */
const schema = {
  search: z
    .string()
    .min(3)
    .max(500)
    .optional()
    .describe("Filter by name (min 3 characters)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Language for names"),
};

/**
 * Maximum number of institutions to display.
 */
const MAX_RESULTS = 50;

/**
 * Checks if any translation of the institution name matches the search term.
 */
function matchesSearch(inst: Institution, searchLower: string): boolean {
  const name = inst.name;
  if (!name) return false;
  return (
    name.de?.toLowerCase().includes(searchLower) ||
    name.fr?.toLowerCase().includes(searchLower) ||
    name.it?.toLowerCase().includes(searchLower) ||
    name.en?.toLowerCase().includes(searchLower) ||
    false
  );
}

/**
 * Handler for list_institutions.
 */
async function handler(params: { search?: string; lang: Language }) {
  const { search, lang } = params;

  try {
    const data = await simap.get<InstitutionsResponse>(ENDPOINTS.INSTITUTIONS, {
      schema: InstitutionsResponseSchema,
    });

    if (!data.institutions || data.institutions.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No institutions found.",
          },
        ],
      };
    }

    let institutions: Institution[] = data.institutions;

    // Filter by search term if provided (searches all languages)
    if (search) {
      const searchLower = search.toLowerCase();
      institutions = institutions.filter((inst) => matchesSearch(inst, searchLower));
    }

    if (institutions.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No institutions found for \`${search}\`.`,
          },
        ],
      };
    }

    let result = search
      ? `# Public Institutions for \`${search}\`\n\n`
      : `# Public Institutions\n\n`;

    result += `${institutions.length} institution(s) found.\n\n`;

    const displayed = institutions.slice(0, MAX_RESULTS);
    for (const inst of displayed) {
      const name = getTranslation(inst.name, lang);
      result += `- **${name}** (ID: \`${inst.id}\`)`;
      if (inst.parentInstitutionId) {
        result += `\n  - Parent: \`${inst.parentInstitutionId}\``;
      }
      result += "\n";
    }

    if (institutions.length > MAX_RESULTS) {
      result += `\n*${institutions.length - MAX_RESULTS} additional institution(s) not displayed. Use the search parameter to filter.*`;
    }

    result += `\n\n*Use these IDs with the issuedByOrganizations parameter of search_tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    console.error("list_institutions error:", error);
    return {
      content: [
        {
          type: "text" as const,
          text: "An error occurred while retrieving institutions. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the list_institutions tool.
 */
export function registerListInstitutions(server: McpServer): void {
  server.tool(
    "list_institutions",
    "List Swiss public institutions (Confederation, cantons, municipalities) that publish tenders",
    schema,
    handler
  );
}
