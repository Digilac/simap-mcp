/**
 * Prompt registration module.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";

import { registerAnalyzeTender } from "./analyze-tender.js";

/**
 * Registers all prompts on the MCP server.
 */
export function registerPrompts(server: FastMCP): void {
  registerAnalyzeTender(server);
}
