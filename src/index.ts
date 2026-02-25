#!/usr/bin/env node

/**
 * SIMAP MCP Server
 *
 * A Model Context Protocol server for interacting with SIMAP.ch,
 * Switzerland's public procurement platform.
 */

import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
