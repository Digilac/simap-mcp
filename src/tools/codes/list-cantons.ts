/**
 * Tool: list_cantons
 * List all Swiss cantons.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simap } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CantonsResponse } from "../../types/api.js";
import { CantonsResponseSchema } from "../../types/schemas.js";
import { toToolErrorResult } from "../../utils/errors.js";

/**
 * Schema (raw shape) for list_cantons parameters. Empty — no inputs.
 */
export const listCantonsInputShape = {} as const;
export const listCantonsInputSchema = z.object(listCantonsInputShape);
export type ListCantonsInput = z.infer<typeof listCantonsInputSchema>;

/**
 * Canton names mapping (API only returns codes).
 */
const CANTON_NAMES: Record<string, string> = {
  ZH: "Zürich",
  BE: "Bern",
  LU: "Luzern",
  UR: "Uri",
  SZ: "Schwyz",
  OW: "Obwalden",
  NW: "Nidwalden",
  ZG: "Zug",
  GL: "Glarus",
  FR: "Fribourg",
  SO: "Solothurn",
  BS: "Basel-Stadt",
  BL: "Basel-Landschaft",
  SH: "Schaffhausen",
  AR: "Appenzell Ausserrhoden",
  AI: "Appenzell Innerrhoden",
  SG: "St. Gallen",
  GR: "Graubünden",
  AG: "Aargau",
  TG: "Thurgau",
  TI: "Ticino",
  VD: "Vaud",
  VS: "Valais",
  NE: "Neuchâtel",
  GE: "Genève",
  JU: "Jura",
};

/**
 * Handler for list_cantons.
 */
async function handler() {
  try {
    const data = await simap.get<CantonsResponse>(ENDPOINTS.CANTONS, {
      schema: CantonsResponseSchema,
    });

    if (!data.cantons || data.cantons.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No cantons found.",
          },
        ],
      };
    }

    let result = `# Swiss Cantons\n\n`;
    result += `| Code | Name |\n|------|------|\n`;

    for (const canton of data.cantons) {
      const name = CANTON_NAMES[canton.id] ?? canton.id;
      result += `| ${canton.id} | ${name} |\n`;
    }

    result += `\n*Use these codes with the cantons parameter of search_tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    return toToolErrorResult(error, {
      toolName: "list_cantons",
      action: "retrieving cantons",
    });
  }
}

/**
 * Registers the list_cantons tool.
 */
export function registerListCantons(server: McpServer): void {
  server.tool(
    "list_cantons",
    "List all Swiss cantons with their codes (useful for search filters)",
    listCantonsInputShape,
    handler
  );
}
