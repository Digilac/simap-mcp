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
import { getTranslation } from "../../utils/translation.js";
import { escapeInlineCode } from "../../utils/formatting.js";
import { toToolErrorResult } from "../../utils/errors.js";

/**
 * Schema (raw shape) for list_institutions parameters.
 */
export const listInstitutionsInputShape = {
  search: z
    .string()
    .min(3)
    .max(500)
    .optional()
    .describe("Filter by name (min 3 characters)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Language for names"),
} as const;

export const listInstitutionsInputSchema = z.object(listInstitutionsInputShape);
export type ListInstitutionsInput = z.infer<typeof listInstitutionsInputSchema>;

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
async function handler(params: ListInstitutionsInput) {
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
            text: `No institutions found for \`${escapeInlineCode(search!)}\`.`,
          },
        ],
      };
    }

    let result = search
      ? `# Public Institutions for \`${escapeInlineCode(search)}\`\n\n`
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
    return toToolErrorResult(error, {
      toolName: "list_institutions",
      action: "retrieving institutions",
    });
  }
}

/**
 * Registers the list_institutions tool.
 */
export function registerListInstitutions(server: McpServer): void {
  server.tool(
    "list_institutions",
    "List Swiss public institutions (Confederation, cantons, municipalities) that publish tenders",
    listInstitutionsInputShape,
    handler
  );
}
