/**
 * Tool: browse_cpv_tree
 * Browse CPV code hierarchy.
 */

import type { z } from "zod";
import { ENDPOINTS } from "../../api/endpoints.js";
import { CPVSearchResponseSchema } from "../../types/schemas.js";
import { defineBrowseTreeTool } from "./code-tool-factory.js";

const tool = defineBrowseTreeTool({
  acronym: "CPV",
  description: "Browse the CPV code hierarchy (shows subcategories of a parent code)",
  endpoint: ENDPOINTS.CPV_LIST,
  responseSchema: CPVSearchResponseSchema,
  parentCodePattern: /^[0-9]{8}$/,
  parentCodeDescription: "Parent code (8 digits). If omitted, shows root categories",
});

export const browseCpvTreeInputSchema = tool.inputSchema;
export type BrowseCpvTreeInput = z.infer<typeof browseCpvTreeInputSchema>;
export const registerBrowseCpvTree = tool.register;
