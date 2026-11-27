/**
 * Tests for the shared tool error helper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolResult } from "@prefecthq/fastmcp-ts/server";
import { toToolErrorResult, toolErrorResult } from "../../src/utils/errors.js";
import { SimapApiError } from "../../src/types/api.js";

const CTX = { toolName: "test_tool", action: "testing" } as const;

/** Text of the first content block; fails the test if it is not a text block. */
function textOf(res: ToolResult): string {
  const [block] = res.result.content;
  if (block?.type !== "text") throw new Error("expected a text content block");
  return block.text;
}

describe("toolErrorResult", () => {
  it("wraps the text in a FastMCP ToolResult flagged isError", () => {
    const res = toolErrorResult("boom");
    expect(res).toBeInstanceOf(ToolResult);
    expect(res.result.isError).toBe(true);
    expect(res.result.content).toEqual([{ type: "text", text: "boom" }]);
  });
});

describe("toToolErrorResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a not-found message for SimapApiError 404", () => {
    const err = new SimapApiError("Not Found", 404, "/x");
    const res = toToolErrorResult(err, CTX);
    expect(res.result.isError).toBe(true);
    expect(textOf(res)).toContain("not found on simap");
    expect(textOf(res)).toContain("testing");
  });

  it("returns a client-error message for SimapApiError 400", () => {
    const err = new SimapApiError("Bad Request", 400, "/x");
    const res = toToolErrorResult(err, CTX);
    expect(textOf(res)).toContain("simap rejected the request");
    expect(textOf(res)).toContain("HTTP 400");
  });

  it("returns a server-error message for SimapApiError 500", () => {
    const err = new SimapApiError("Server Error", 500, "/x");
    const res = toToolErrorResult(err, CTX);
    expect(textOf(res)).toContain("currently unavailable");
    expect(textOf(res)).toContain("HTTP 500");
  });

  it("returns a network message for AbortError", () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    const res = toToolErrorResult(err, CTX);
    expect(textOf(res)).toContain("Network or timeout error");
  });

  it("returns a network message for 'fetch failed' errors", () => {
    const err = new Error("fetch failed");
    const res = toToolErrorResult(err, CTX);
    expect(textOf(res)).toContain("Network or timeout error");
  });

  it("returns a generic message for unknown errors", () => {
    const res = toToolErrorResult("unexpected string thrown", CTX);
    expect(textOf(res)).toContain("An error occurred while testing");
    expect(res.result.isError).toBe(true);
  });

  it("logs the original error to stderr", () => {
    const spy = vi.spyOn(console, "error");
    const err = new SimapApiError("Not Found", 404, "/x");
    toToolErrorResult(err, CTX);
    expect(spy).toHaveBeenCalledWith("test_tool error:", err);
  });
});
