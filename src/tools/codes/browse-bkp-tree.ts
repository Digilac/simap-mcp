/**
 * Tool: browse_bkp_tree
 * Browse BKP (Baukostenplan) code hierarchy.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CodeTreeResponseSchema } from "../../types/schemas.js";
import { defineBrowseTreeTool } from "./code-tool-factory.js";

const tool = defineBrowseTreeTool({
  acronym: "BKP",
  description: "Browse the BKP code hierarchy (Swiss construction cost plan)",
  endpoint: ENDPOINTS.BKP_LIST,
  responseSchema: CodeTreeResponseSchema,
  parentCodePattern: /^[0-9]{1,3}(\.[0-9])?$/,
  parentCodeDescription: "Parent BKP code. If omitted, shows root categories",
  extraFooter: "*Use these codes with the bkpCodes parameter of search_tenders.*",
});

export const browseBkpTreeInputSchema = tool.inputSchema;
export type BrowseBkpTreeInput = z.infer<typeof browseBkpTreeInputSchema>;
export const registerBrowseBkpTree = tool.register;
