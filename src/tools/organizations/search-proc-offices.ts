/**
 * Tool: search_proc_offices
 * Search procurement offices.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { ProcOfficesPublicResponse, ProcOfficeType } from "../../types/api.js";
import { ProcOfficesPublicResponseSchema } from "../../types/schemas.js";
import { formatInlineCode } from "../../utils/formatting.js";
import { toToolErrorResult, toolErrorResult } from "../../utils/errors.js";
import { registerTool } from "../../utils/register-tool.js";

/**
 * Schema for search_proc_offices parameters.
 */
export const searchProcOfficesInputSchema = z.object({
  search: z
    .string()
    .min(3)
    .max(500)
    .optional()
    .describe("Name to search (min 3 characters)"),
  institutionId: z
    .string()
    .uuid()
    .optional()
    .describe("Filter by parent institution (UUID)"),
});
export type SearchProcOfficesInput = z.infer<typeof searchProcOfficesInputSchema>;

/**
 * Maximum number of results to display.
 */
const MAX_RESULTS = 50;

/**
 * Maps proc office type to a human-readable English label.
 */
function getTypeLabel(type: ProcOfficeType): string {
  const labels: Record<ProcOfficeType, string> = {
    federal: "Federal",
    cantonal: "Cantonal",
    inter_cantonal: "Inter-cantonal",
    communal: "Communal",
    other_communal: "Other communal",
    international: "International",
  };
  return labels[type] || type;
}

/**
 * Handler for search_proc_offices.
 */
async function handler(params: SearchProcOfficesInput) {
  const { search, institutionId } = params;

  // At least one parameter is required
  if (!search && !institutionId) {
    return toolErrorResult(
      "Please provide at least one parameter: search or institutionId."
    );
  }

  try {
    const queryParams: Record<string, string | undefined> = {};
    if (search) {
      queryParams.search = search;
    }
    if (institutionId) {
      queryParams.institutionId = institutionId;
    }

    const data = await simap.get<ProcOfficesPublicResponse>(ENDPOINTS.PROC_OFFICES, {
      params: queryParams,
      schema: ProcOfficesPublicResponseSchema,
    });

    if (!data.procOffices || data.procOffices.length === 0) {
      const searchDesc = search ? ` for ${formatInlineCode(search)}` : "";
      return `No procurement offices found${searchDesc}.`;
    }

    let result = search
      ? `# Procurement Offices for ${formatInlineCode(search)}\n\n`
      : `# Procurement Offices\n\n`;

    result += `${data.procOffices.length} office(s) found.\n\n`;

    const displayed = data.procOffices.slice(0, MAX_RESULTS);
    for (const office of displayed) {
      const typeLabel = getTypeLabel(office.type);
      result += `## ${office.name}\n\n`;
      result += `- **ID:** \`${office.id}\`\n`;
      result += `- **Type:** ${typeLabel}\n`;
      result += `- **Institution ID:** \`${office.institutionId}\`\n`;
      result += `- **Competence Centre ID:** \`${office.compCentreId}\`\n`;
      result += "\n";
    }

    if (data.procOffices.length > MAX_RESULTS) {
      result += `\n*${data.procOffices.length - MAX_RESULTS} additional office(s) not displayed. Refine your search.*`;
    }

    result += `\n*Use these IDs with the issuedByOrganizations parameter of search_tenders.*`;

    return result;
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_proc_offices",
      action: "searching procurement offices",
    });
  }
}

/**
 * Registers the search_proc_offices tool.
 */
export function registerSearchProcOffices(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "search_proc_offices",
      description: "Search public procurement offices by name or institution",
      input: searchProcOfficesInputSchema,
    },
    handler
  );
}
