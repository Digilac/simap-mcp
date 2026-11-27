/**
 * Tool: browse_oag_tree
 * Browse OAG (Objektartengliederung) code hierarchy.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CodeTreeResponseSchema } from "../../types/schemas.js";
import { defineBrowseTreeTool } from "./code-tool-factory.js";

const tool = defineBrowseTreeTool({
  acronym: "OAG",
  description: "Browse the OAG code hierarchy (object type classification)",
  endpoint: ENDPOINTS.OAG_LIST,
  responseSchema: CodeTreeResponseSchema,
  parentCodePattern: /^[0-9]{1,10}$/,
  parentCodeDescription: "Parent OAG code. If omitted, shows root categories",
});

export const browseOagTreeInputSchema = tool.inputSchema;
export type BrowseOagTreeInput = z.infer<typeof browseOagTreeInputSchema>;
export const registerBrowseOagTree = tool.register;
