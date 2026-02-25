/**
 * Tool registration module.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerSearchTenders } from "./search-tenders.js";
import { registerGetTenderDetails } from "./get-tender-details.js";
import { registerCodeTools } from "./codes/index.js";
import { registerOrganizationTools } from "./organizations/index.js";

/**
 * Registers all tools on the MCP server.
 */
export function registerTools(server: McpServer): void {
  // Core tools
  registerSearchTenders(server);
  registerGetTenderDetails(server);

  // Code/nomenclature tools (Phase 2, 4)
  registerCodeTools(server);

  // Organization tools (Phase 2, 3)
  registerOrganizationTools(server);
}
