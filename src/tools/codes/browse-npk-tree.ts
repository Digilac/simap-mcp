/**
 * Tool: browse_npk_tree
 * Browse NPK (Normpositionen-Katalog) code hierarchy.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { defineBrowseTreeTool } from "./code-tool-factory.js";

const tool = defineBrowseTreeTool({
  acronym: "NPK",
  description: "Browse the NPK code hierarchy (standardized positions catalog)",
  endpoint: ENDPOINTS.NPK_LIST,
  parentCodePattern: /^[0-9]{1,10}$/,
  parentCodeDescription: "Parent NPK code. If omitted, shows root categories",
});

export const browseNpkTreeInputSchema = tool.inputSchema;
export type BrowseNpkTreeInput = z.infer<typeof browseNpkTreeInputSchema>;
export const registerBrowseNpkTree = tool.register;
