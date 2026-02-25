/**
 * Tool: get_tender_details
 * Get detailed information about a specific tender.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../api/client.js";
import { ENDPOINTS } from "../api/endpoints.js";
import type { ProjectHeader, PublicationDetails } from "../types/api.js";
import type { Language } from "../types/common.js";
import {
  formatProjectHeader,
  formatPublicationDetails,
  formatJsonPreview,
} from "../utils/formatting.js";

/**
 * Schema for get_tender_details parameters.
 */
const schema = {
  projectId: z.string().uuid().describe("Project ID (UUID)"),
  publicationId: z.string().uuid().describe("Publication ID (UUID)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Preferred language"),
};

/**
 * Handler for get_tender_details.
 */
async function handler(params: {
  projectId: string;
  publicationId: string;
  lang: Language;
}) {
  const { projectId, publicationId, lang } = params;

  try {
    // Fetch both the header and the publication details in parallel
    const [header, details] = await Promise.all([
      simap.get<ProjectHeader>(ENDPOINTS.PROJECT_HEADER(projectId)).catch(() => null),
      simap
        .get<PublicationDetails>(ENDPOINTS.PUBLICATION_DETAILS(projectId, publicationId))
        .catch(() => null),
    ]);

    if (!header && !details) {
      throw new Error("Unable to retrieve project or publication data");
    }

    let result = `# Tender Details\n\n`;

    // Format header if available
    if (header) {
      result += formatProjectHeader(header, lang, projectId);
    }

    // Format details if available
    if (details) {
      result += "\n" + formatPublicationDetails(details, lang);

      // Add raw JSON preview
      result += `\n### Raw Data (excerpt)\n`;
      result += "```json\n";
      result += formatJsonPreview(details);
      result += "\n```\n";
    }

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error retrieving details: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the get_tender_details tool.
 */
export function registerGetTenderDetails(server: McpServer): void {
  server.tool(
    "get_tender_details",
    "Get detailed information about a specific tender",
    schema,
    handler
  );
}
