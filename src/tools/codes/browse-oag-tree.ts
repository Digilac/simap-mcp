/**
 * Tool: browse_oag_tree
 * Browse OAG (Objektartengliederung) code hierarchy.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { defineBrowseTreeTool } from "./code-tool-factory.js";

const tool = defineBrowseTreeTool({
  acronym: "OAG",
  description: "Browse the OAG code hierarchy (object type classification)",
  endpoint: ENDPOINTS.OAG_LIST,
  // OAG codes are dotted: `1`, `1.2`, `1.10`, `4.4.2`.
  parentCodePattern: /^[0-9]{1,3}(\.[0-9]{1,3}){0,3}$/,
  parentCodeDescription:
    "Parent OAG code, e.g. 1 or 1.2. If omitted, shows root categories",
});

export const browseOagTreeInputSchema = tool.inputSchema;
export type BrowseOagTreeInput = z.infer<typeof browseOagTreeInputSchema>;
export const registerBrowseOagTree = tool.register;
