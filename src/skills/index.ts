/**
 * Skill registration module (MCP Skills extension).
 */

import type { FastMCP, Skill } from "@prefecthq/fastmcp-ts/server";

import { createSimapWorkflowSkill } from "./simap-workflow.js";

/**
 * Publishes all Skills on the MCP server.
 *
 * `Skill.create()` is async, so the catalog is built on the first request that
 * needs it and then reused: the content is static.
 */
export function registerSkills(server: FastMCP): void {
  let catalog: Promise<Skill[]> | undefined;
  server.skills(() => (catalog ??= Promise.all([createSimapWorkflowSkill()])));
}
