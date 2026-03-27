/**
 * MCP Server configuration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "node:module";
import { registerTools } from "./tools/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

/**
 * Creates and configures the MCP server.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "simap",
    version,
  });

  registerTools(server);

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SIMAP MCP Server running on stdio");
}
