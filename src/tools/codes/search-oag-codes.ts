/**
 * Tool: search_oag_codes
 * Search OAG (Objektartengliederung) codes.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CodeSearchResponseSchema } from "../../types/schemas.js";
import { defineSearchCodesTool } from "./code-tool-factory.js";

const tool = defineSearchCodesTool({
  acronym: "OAG",
  description: "Search OAG (object type classification) codes by keyword or number",
  endpoint: ENDPOINTS.OAG_SEARCH,
  responseSchema: CodeSearchResponseSchema,
  queryDescription: "Search term (keyword or code number)",
  footer: "*OAG codes classify objects by type in construction projects.*",
});

export const searchOagCodesInputSchema = tool.inputSchema;
export type SearchOagCodesInput = z.infer<typeof searchOagCodesInputSchema>;
export const registerSearchOagCodes = tool.register;
