/**
 * Tool: get_publication_history
 * Get the publication history for a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS, SIMAP_API_BASE } from "../../api/endpoints.js";
import type { PastPublicationsResponse } from "../../types/api.js";
import { PastPublicationsResponseSchema } from "../../types/schemas.js";

/**
 * Schema for get_publication_history parameters.
 */
const schema = {
  publicationId: z.string().uuid().describe("Current publication ID (UUID)"),
  lotId: z.string().uuid().optional().describe("Lot ID (optional, to filter by lot)"),
};

/**
 * Maps pubType to a human-readable English label.
 */
function getPubTypeLabel(pubType: string): string {
  const labels: Record<string, string> = {
    advance_notice: "Advance Notice",
    request_for_information: "Request for Information",
    tender: "Tender",
    competition: "Competition",
    study_contract: "Study Contract",
    award_tender: "Award",
    award_study_contract: "Award (Study)",
    award_competition: "Award (Competition)",
    direct_award: "Direct Award",
    participant_selection: "Participant Selection",
    selective_offering_phase: "Selective Offering Phase",
    correction: "Correction",
    revocation: "Revocation",
    abandonment: "Abandonment",
  };
  return labels[pubType] || pubType;
}

/**
 * Handler for get_publication_history.
 */
async function handler(params: { publicationId: string; lotId?: string }) {
  const { publicationId, lotId } = params;

  try {
    const queryParams: Record<string, string | undefined> = {};
    if (lotId) {
      queryParams.lotId = lotId;
    }

    const data = await simap.get<PastPublicationsResponse>(
      ENDPOINTS.PAST_PUBLICATIONS(publicationId),
      { params: queryParams, schema: PastPublicationsResponseSchema }
    );

    if (!data.pastPublications || data.pastPublications.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No previous publications found for this project.",
          },
        ],
      };
    }

    let result = `# Publication History\n\n`;
    result += `${data.pastPublications.length} previous publication(s).\n\n`;

    for (const pub of data.pastPublications) {
      const typeLabel = getPubTypeLabel(pub.pubType);
      result += `## ${pub.publicationNumber} - ${typeLabel}\n\n`;
      result += `- **Date:** ${pub.publicationDate}\n`;
      result += `- **Project Type:** ${pub.projectSubType}\n`;
      result += `- **Process:** ${pub.processType}\n`;
      if (pub.lotNumber !== undefined && pub.lotNumber !== null) {
        result += `- **Lot:** ${pub.lotNumber}\n`;
      }
      if (pub.corrected) {
        result += `- **Corrected:** Yes\n`;
      }
      result += `- **ID:** \`${pub.id}\`\n`;

      // Add SIMAP URL
      const simapUrl = `${SIMAP_API_BASE.replace("/api", "")}/publications/${pub.id}`;
      result += `- **SIMAP URL:** ${simapUrl}\n`;

      result += "\n";
    }

    result += `*Use get_tender_details with the publication ID to see full details.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    console.error("get_publication_history error:", error);

    // API returns 400 when no history is available
    if (error instanceof Error && error.message.includes("400")) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No history available for this publication. This may indicate it is the first publication of the project.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: "An error occurred while retrieving publication history. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Registers the get_publication_history tool.
 */
export function registerGetPublicationHistory(server: McpServer): void {
  server.tool(
    "get_publication_history",
    "Get the publication history for a project (corrections, awards, etc.)",
    schema,
    handler
  );
}
