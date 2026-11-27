/**
 * Tool: search_npk_codes
 * Search NPK (Normpositionen-Katalog) codes.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CodeSearchResponseSchema } from "../../types/schemas.js";
import { defineSearchCodesTool } from "./code-tool-factory.js";

const tool = defineSearchCodesTool({
  acronym: "NPK",
  description: "Search NPK (standardized positions catalog) codes by keyword or number",
  endpoint: ENDPOINTS.NPK_SEARCH,
  responseSchema: CodeSearchResponseSchema,
  queryDescription: "Search term (keyword or code number)",
  footer: "*NPK codes are used for standardized positions in construction tenders.*",
});

export const searchNpkCodesInputSchema = tool.inputSchema;
export type SearchNpkCodesInput = z.infer<typeof searchNpkCodesInputSchema>;
export const registerSearchNpkCodes = tool.register;
