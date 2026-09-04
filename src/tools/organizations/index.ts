/**
 * Organization-related tools.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { registerListInstitutions } from "./list-institutions.js";
import { registerGetPublicationHistory } from "./get-publication-history.js";
import { registerSearchProcOffices } from "./search-proc-offices.js";

/**
 * Registers all organization-related tools.
 */
export function registerOrganizationTools(server: FastMCP): void {
  // Phase 2
  registerListInstitutions(server);

  // Phase 3
  registerGetPublicationHistory(server);
  registerSearchProcOffices(server);
}
