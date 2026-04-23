/**
 * Shared error handling for MCP tool handlers.
 *
 * Converts arbitrary errors into a typed user-facing tool result,
 * distinguishing between not-found (404), client errors (400-499),
 * server errors (500-599), and network/timeout issues.
 */

import { SimapApiError } from "../types/api.js";

export interface ToolErrorContext {
  /** MCP tool name, e.g. "search_tenders" (used in stderr logs). */
  toolName: string;
  /** Short gerund describing what failed, e.g. "searching tenders". */
  action: string;
}

/**
 * Detects network / timeout / abort errors that are not SimapApiError.
 */
function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const msg = error.message;
  const lower = msg.toLowerCase();
  return (
    // Node error codes are always uppercase — keep the literal checks.
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    // Message prose varies across runtimes ("fetch failed", "Network request failed", …).
    lower.includes("fetch failed") ||
    lower.includes("network")
  );
}

/**
 * Converts an unknown error thrown from a tool handler into a typed tool result
 * with a user-facing message that matches the failure mode.
 *
 * Always logs the underlying error to stderr for operator debugging.
 */
export function toToolErrorResult(error: unknown, ctx: ToolErrorContext) {
  console.error(`${ctx.toolName} error:`, error);

  let text: string;

  if (error instanceof SimapApiError) {
    if (error.statusCode === 404) {
      text = `The requested resource was not found on simap (while ${ctx.action}).`;
    } else if (error.statusCode >= 400 && error.statusCode < 500) {
      text = `simap rejected the request while ${ctx.action} (HTTP ${error.statusCode}). Please check the input parameters.`;
    } else if (error.statusCode >= 500 && error.statusCode < 600) {
      text = `simap is currently unavailable (HTTP ${error.statusCode}). Please try again later.`;
    } else {
      text = `An unexpected simap error occurred while ${ctx.action} (HTTP ${error.statusCode}).`;
    }
  } else if (isNetworkOrTimeoutError(error)) {
    text = `Network or timeout error while ${ctx.action}. Please check connectivity and try again.`;
  } else {
    text = `An error occurred while ${ctx.action}. Please try again.`;
  }

  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
}
