/**
 * Shared FastMCP tool registration.
 *
 * Every tool goes through `registerTool()` so two protocol-level details are
 * handled in one place rather than in 14 files:
 *
 * 1. **Advertised JSON Schema** — FastMCP auto-generates `inputSchema` from the
 *    Zod schema in *output* mode, which marks fields with `.default()` as
 *    `required`. Clients (and models) would then believe `lang` etc. must be
 *    sent. We generate the schema ourselves in *input* mode so defaults stay
 *    optional, exactly as with the raw MCP SDK.
 *
 * 2. **Validation errors** — FastMCP turns failed input validation into a
 *    JSON-RPC `-32602` protocol error whose message drops the field paths.
 *    Many clients surface protocol errors as hard failures the model cannot
 *    read. We validate here and return an `isError: true` tool result that
 *    lists every issue with its path, so the model can self-correct.
 */

import type { FastMCP, ToolResult } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { toolErrorResult } from "./errors.js";

/** Result shape every tool handler may return. */
export type ToolHandlerResult = string | ToolResult;

export interface ToolDefinition<S extends z.ZodObject> {
  /** MCP tool name (snake_case). */
  name: string;
  /** One-line description shown to the client. */
  description: string;
  /** Zod schema describing the tool arguments. */
  input: S;
}

/**
 * Formats Zod issues into a single user-facing message, one issue per line
 * with the offending field path (e.g. `projectId: Invalid UUID`).
 */
export function formatValidationError(toolName: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  return `Invalid arguments for tool ${toolName}:\n${lines.join("\n")}`;
}

/**
 * Registers a tool on the FastMCP server with an input-mode JSON Schema and
 * tool-result validation errors (see module doc).
 */
export function registerTool<S extends z.ZodObject>(
  server: FastMCP,
  definition: ToolDefinition<S>,
  handler: (params: z.output<S>) => Promise<ToolHandlerResult> | ToolHandlerResult
): void {
  const { name, description, input } = definition;

  server.tool(
    {
      name,
      description,
      inputSchema: z.toJSONSchema(input, { io: "input" }),
    },
    async (rawArgs: Record<string, unknown>) => {
      const parsed = input.safeParse(rawArgs);
      if (!parsed.success) {
        return toolErrorResult(formatValidationError(name, parsed.error));
      }
      return handler(parsed.data);
    }
  );
}
