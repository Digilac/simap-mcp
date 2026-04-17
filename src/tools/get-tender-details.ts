/**
 * Tool: get_tender_details
 * Get detailed information about a specific tender.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../api/client.js";
import { ENDPOINTS } from "../api/endpoints.js";
import { SimapApiError } from "../types/api.js";
import type { ProjectHeader, PublicationDetails } from "../types/api.js";
import { ProjectHeaderSchema, PublicationDetailsSchema } from "../types/schemas.js";
import {
  formatProjectHeader,
  formatPublicationDetails,
  formatJsonPreview,
} from "../utils/formatting.js";
import { toToolErrorResult } from "../utils/errors.js";

/**
 * Schema (raw shape) for get_tender_details parameters.
 * Exported so tests can import the source of truth.
 */
export const getTenderDetailsInputShape = {
  projectId: z.string().uuid().describe("Project ID (UUID)"),
  publicationId: z.string().uuid().describe("Publication ID (UUID)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Preferred language"),
} as const;

export const getTenderDetailsInputSchema = z.object(getTenderDetailsInputShape);
export type GetTenderDetailsInput = z.infer<typeof getTenderDetailsInputSchema>;

/**
 * Fetches data, returning null only for 404 (not found).
 * Re-throws all other errors.
 */
async function fetchOrNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof SimapApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Handler for get_tender_details.
 */
async function handler(params: GetTenderDetailsInput) {
  const { projectId, publicationId, lang } = params;

  try {
    // Fetch both the header and the publication details in parallel
    const [header, details] = await Promise.all([
      fetchOrNull(
        simap.get<ProjectHeader>(ENDPOINTS.PROJECT_HEADER(projectId), {
          schema: ProjectHeaderSchema,
        })
      ),
      fetchOrNull(
        simap.get<PublicationDetails>(
          ENDPOINTS.PUBLICATION_DETAILS(projectId, publicationId),
          { schema: PublicationDetailsSchema }
        )
      ),
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
    return toToolErrorResult(error, {
      toolName: "get_tender_details",
      action: "retrieving tender details",
    });
  }
}

/**
 * Registers the get_tender_details tool.
 */
export function registerGetTenderDetails(server: McpServer): void {
  server.tool(
    "get_tender_details",
    "Get detailed information about a specific tender",
    getTenderDetailsInputShape,
    handler
  );
}
