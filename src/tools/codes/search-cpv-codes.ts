/**
 * Tool: search_cpv_codes
 * Search CPV (Common Procurement Vocabulary) codes.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CPVSearchResponseSchema } from "../../types/schemas.js";
import { defineSearchCodesTool } from "./code-tool-factory.js";

const tool = defineSearchCodesTool({
  acronym: "CPV",
  description:
    "Search CPV (Common Procurement Vocabulary) codes by keyword or partial code number",
  endpoint: ENDPOINTS.CPV_SEARCH,
  // The only nomenclature whose search results are nested.
  responseSchema: CPVSearchResponseSchema,
  queryDescription: "Search term (keyword or code prefix)",
  footer: "*Use these codes with the cpvCodes parameter of search_tenders.*",
});

export const searchCpvCodesInputSchema = tool.inputSchema;
export type SearchCpvCodesInput = z.infer<typeof searchCpvCodesInputSchema>;
export const registerSearchCpvCodes = tool.register;
