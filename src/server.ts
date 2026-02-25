/**
 * MCP Server configuration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

/**
 * Creates and configures the MCP server.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "simap",
    version: "1.0.0",
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
