/**
 * MCP Server configuration.
 *
 * Built on FastMCP (https://github.com/PrefectHQ/fastmcp-ts), which wraps
 * the official MCP SDK and owns transport + protocol wiring.
 */

import { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { createRequire } from "node:module";
import { registerTools } from "./tools/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

/**
 * Creates and configures the MCP server.
 */
export function createServer(): FastMCP {
  const server = new FastMCP({
    name: "simap",
    version,
  });

  registerTools(server);

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 *
 * This server is stdio-only (see SECURITY.md). FastMCP lets the `MCP_TRANSPORT`
 * environment variable override the transport passed to `run()`, which could
 * silently start an unauthenticated HTTP listener if that variable happens to
 * be set in the host environment — so it is neutralised here first. FastMCP
 * prints its own startup banner to stderr (`starting simap vX (stdio)`).
 */
export async function startServer(): Promise<void> {
  const requested = process.env.MCP_TRANSPORT;
  if (requested !== undefined && requested !== "stdio") {
    console.error(`Ignoring MCP_TRANSPORT=${requested}: simap MCP only supports stdio.`);
    process.env.MCP_TRANSPORT = "stdio";
  }

  const server = createServer();
  await server.run({ transport: "stdio" });
}
