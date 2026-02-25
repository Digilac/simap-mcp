/**
 * Code/nomenclature tools.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchCpvCodes } from "./search-cpv-codes.js";
import { registerListCantons } from "./list-cantons.js";
import { registerSearchBkpCodes } from "./search-bkp-codes.js";
import { registerSearchNpkCodes } from "./search-npk-codes.js";
import { registerSearchOagCodes } from "./search-oag-codes.js";
import { registerBrowseCpvTree } from "./browse-cpv-tree.js";
import { registerBrowseBkpTree } from "./browse-bkp-tree.js";
import { registerBrowseNpkTree } from "./browse-npk-tree.js";
import { registerBrowseOagTree } from "./browse-oag-tree.js";

/**
 * Registers all code-related tools.
 */
export function registerCodeTools(server: McpServer): void {
  // Phase 2
  registerSearchCpvCodes(server);
  registerListCantons(server);

  // Phase 4
  registerSearchBkpCodes(server);
  registerSearchNpkCodes(server);
  registerSearchOagCodes(server);
  registerBrowseCpvTree(server);
  registerBrowseBkpTree(server);
  registerBrowseNpkTree(server);
  registerBrowseOagTree(server);
}
