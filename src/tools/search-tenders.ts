/**
 * Tool: search_tenders
 * Search public procurement tenders on SIMAP.ch
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../api/client.js";
import { ENDPOINTS } from "../api/endpoints.js";
import type { ProjectsSearchResponse } from "../types/api.js";
import { ProjectsSearchResponseSchema } from "../types/schemas.js";
import { formatProject, formatHeader } from "../utils/formatting.js";
import { toToolErrorResult } from "../utils/errors.js";
import { buildTenderSearchQuery } from "./search-tenders-params.js";

/**
 * Valid Swiss canton codes.
 */
const SWISS_CANTONS = [
  "AG",
  "AI",
  "AR",
  "BE",
  "BL",
  "BS",
  "FR",
  "GE",
  "GL",
  "GR",
  "JU",
  "LU",
  "NE",
  "NW",
  "OW",
  "SG",
  "SH",
  "SO",
  "SZ",
  "TG",
  "TI",
  "UR",
  "VD",
  "VS",
  "ZG",
  "ZH",
] as const;

/**
 * Schema (raw shape) for search_tenders parameters.
 *
 * Exported so tests can import the source of truth instead of redefining it.
 * `searchTendersInputShape` is the plain object consumed by `server.tool()`;
 * `searchTendersInputSchema` wraps it in a `z.object()` for `.safeParse()` in tests.
 */
export const searchTendersInputShape = {
  search: z
    .string()
    .min(3)
    .max(500)
    .optional()
    .describe("Search text (min 3 characters)"),
  publicationFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
    .optional()
    .describe("Publication start date (format YYYY-MM-DD)"),
  publicationUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
    .optional()
    .describe("Publication end date (format YYYY-MM-DD)"),
  projectSubTypes: z
    .array(
      z.enum([
        "construction",
        "service",
        "supply",
        "project_competition",
        "idea_competition",
        "overall_performance_competition",
        "project_study",
        "idea_study",
        "overall_performance_study",
        "request_for_information",
      ])
    )
    .max(10)
    .optional()
    .describe("Project types to filter"),
  cantons: z
    .array(z.enum(SWISS_CANTONS))
    .max(26)
    .optional()
    .describe("Swiss cantons (e.g., BE, VD, GE, ZH)"),
  processTypes: z
    .array(z.enum(["open", "selective", "invitation", "direct", "no_process"]))
    .max(5)
    .optional()
    .describe("Process types (open, selective, invitation, direct, no_process)"),
  pubTypes: z
    .array(
      z.enum([
        "advance_notice",
        "request_for_information",
        "tender",
        "competition",
        "study_contract",
        "award_tender",
        "award_study_contract",
        "award_competition",
        "direct_award",
        "participant_selection",
        "selective_offering_phase",
        "correction",
        "revocation",
        "abandonment",
      ])
    )
    .max(14)
    .optional()
    .describe("Publication types (tender, award_tender, correction, etc.)"),
  cpvCodes: z
    .array(z.string().regex(/^[0-9]{8}$/))
    .max(50)
    .optional()
    .describe("CPV codes (8 digits, e.g., 72000000 for IT services)"),
  bkpCodes: z
    .array(z.string().regex(/^[0-9]{1,3}(\.[0-9])?$/))
    .max(50)
    .optional()
    .describe("BKP codes for construction (e.g., 211 for masonry)"),
  issuedByOrganizations: z
    .array(z.string().uuid())
    .max(50)
    .optional()
    .describe("UUIDs of issuing organizations"),
  lastItem: z
    .string()
    .regex(/^\d{8}\|.+$/, "Invalid pagination token format")
    .optional()
    .describe("Pagination token (format: date|projectNumber) to retrieve the next page"),
  lang: z
    .enum(["de", "fr", "it", "en"])
    .default("en")
    .describe("Preferred language for results"),
} as const;

export const searchTendersInputSchema = z.object(searchTendersInputShape);
export type SearchTendersInput = z.infer<typeof searchTendersInputSchema>;

/**
 * Handler for search_tenders.
 */
async function handler(params: SearchTendersInput) {
  const { lang } = params;
  const queryParams = buildTenderSearchQuery(params);

  try {
    const data = await simap.get<ProjectsSearchResponse>(ENDPOINTS.PROJECT_SEARCH, {
      params: queryParams,
      schema: ProjectsSearchResponseSchema,
    });

    if (data.projects.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No tenders found matching these criteria.",
          },
        ],
      };
    }

    let result = formatHeader("SIMAP Search Results", data.projects.length);

    for (const project of data.projects) {
      result += formatProject(project, lang);
      result += "\n---\n\n";
    }

    if (data.pagination.lastItem) {
      const itemsPerPage = data.pagination.itemsPerPage ?? 20;
      result += `\n*Page of ${data.projects.length} results (${itemsPerPage} per page). `;
      result += `More results available. Use lastItem: "${data.pagination.lastItem}" to retrieve the next page.*`;
    }

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "search_tenders",
      action: "searching tenders",
    });
  }
}

/**
 * Registers the search_tenders tool.
 */
export function registerSearchTenders(server: McpServer): void {
  server.tool(
    "search_tenders",
    "Search public tenders on SIMAP.ch with filters by date, canton, CPV codes, and other criteria",
    searchTendersInputShape,
    handler
  );
}
