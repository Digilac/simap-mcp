/**
 * Tool: search_proc_offices
 * Search procurement offices.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type {
  KnownProcOfficeType,
  ProcOfficePublicData,
  ProcOfficesPublicResponse,
  ProcOfficeType,
} from "../../types/api.js";
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
 * Human-readable English labels for the office types simap is known to return.
 */
const TYPE_LABELS: Record<KnownProcOfficeType, string> = {
  federal: "Federal",
  central_federation: "Federal (central administration)",
  decentral_federation: "Federal (decentralised administration)",
  other_federation: "Other federal",
  cantonal: "Cantonal",
  other_cantonal: "Other cantonal",
  inter_cantonal: "Inter-cantonal",
  communal: "Communal",
  other_communal: "Other communal",
  international: "International",
};

/**
 * Maps a proc office type to a human-readable English label. A type simap
 * added after this list was written is shown as-is, as inline code.
 */
export function getProcOfficeTypeLabel(type: ProcOfficeType): string {
  return Object.hasOwn(TYPE_LABELS, type)
    ? TYPE_LABELS[type as KnownProcOfficeType]
    : formatInlineCode(type);
}

/**
 * Formats the matching procurement offices as Markdown.
 */
export function formatProcOffices(
  procOffices: ProcOfficePublicData[],
  search?: string
): string {
  let result = search
    ? `# Procurement Offices for ${formatInlineCode(search)}\n\n`
    : `# Procurement Offices\n\n`;

  result += `${procOffices.length} office(s) found.\n\n`;

  const displayed = procOffices.slice(0, MAX_RESULTS);
  for (const office of displayed) {
    result += `## ${office.name}\n\n`;
    result += `- **ID:** \`${office.id}\`\n`;
    result += `- **Type:** ${getProcOfficeTypeLabel(office.type)}\n`;
    result += `- **Institution ID:** \`${office.institutionId}\`\n`;
    result += `- **Competence Centre ID:** \`${office.compCentreId}\`\n`;
    result += "\n";
  }

  if (procOffices.length > MAX_RESULTS) {
    result += `\n*${procOffices.length - MAX_RESULTS} additional office(s) not displayed. Refine your search.*`;
  }

  result += `\n*Use these IDs with the issuedByOrganizations parameter of search_tenders.*`;

  return result;
}

/**
 * Handler for search_proc_offices.
 */
export async function handler(params: SearchProcOfficesInput) {
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

    return formatProcOffices(data.procOffices, search);
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
      title: "Search Procurement Offices",
      description: "Search public procurement offices by name or institution",
      input: searchProcOfficesInputSchema,
    },
    handler
  );
}
