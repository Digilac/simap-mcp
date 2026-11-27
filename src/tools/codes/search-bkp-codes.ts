/**
 * Tool: search_bkp_codes
 * Search BKP (Baukostenplan) codes for construction projects.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { defineSearchCodesTool } from "./code-tool-factory.js";

const tool = defineSearchCodesTool({
  acronym: "BKP",
  description: "Search BKP (Swiss construction cost plan) codes by keyword or number",
  endpoint: ENDPOINTS.BKP_SEARCH,
  queryDescription: "Search term (keyword or code number)",
  footer: "*Use these codes with the bkpCodes parameter of search_tenders.*",
});

export const searchBkpCodesInputSchema = tool.inputSchema;
export type SearchBkpCodesInput = z.infer<typeof searchBkpCodesInputSchema>;
export const registerSearchBkpCodes = tool.register;
