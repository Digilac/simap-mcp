/**
 * Tool: get_tender_details
 * Get detailed information about a specific tender.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { simap } from "../api/client.js";
import { ENDPOINTS } from "../api/endpoints.js";
import { SimapApiError } from "../types/api.js";
import type { ProjectHeader, PublicationDetails } from "../types/api.js";
import { ProjectHeaderSchema, PublicationDetailsSchema } from "../types/schemas.js";
import { formatProjectHeader, formatPublicationDetails } from "../utils/formatting.js";
import { toToolErrorResult } from "../utils/errors.js";
import { registerTool } from "../utils/register-tool.js";

/**
 * Schema for get_tender_details parameters.
 * Exported so tests can import the source of truth.
 */
export const getTenderDetailsInputSchema = z.object({
  projectId: z.string().uuid().describe("Project ID (UUID)"),
  publicationId: z.string().uuid().describe("Publication ID (UUID)"),
  lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Preferred language"),
  fullRaw: z
    .boolean()
    .default(false)
    .describe(
      "Include the complete unmodified API response as JSON at the end of the output. Verbose — only enable when the structured fields are insufficient."
    ),
});
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
 * Handler for get_tender_details. Exported for tests.
 */
export async function handler(params: GetTenderDetailsInput) {
  const { projectId, publicationId, lang, fullRaw } = params;

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
      throw new SimapApiError(
        "Both header and details returned 404",
        404,
        ENDPOINTS.PROJECT_HEADER(projectId)
      );
    }

    let result = `# Tender Details\n\n`;

    // Format header if available
    if (header) {
      result += formatProjectHeader(header, lang, projectId);
    }

    // Format details if available
    if (details) {
      result += "\n" + formatPublicationDetails(details, lang);

      if (fullRaw) {
        result += `\n### Full Raw Response\n\n`;
        result += "```json\n";
        result += JSON.stringify(details, null, 2);
        result += "\n```\n";
      }
    }

    return result;
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
export function registerGetTenderDetails(server: FastMCP): void {
  registerTool(
    server,
    {
      name: "get_tender_details",
      description: "Get detailed information about a specific tender",
      input: getTenderDetailsInputSchema,
    },
    handler
  );
}
