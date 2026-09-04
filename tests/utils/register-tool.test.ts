/**
 * Tests for the shared FastMCP tool registration helper.
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { ToolResult, type FastMCP } from "@prefecthq/fastmcp-ts/server";
import { formatValidationError, registerTool } from "../../src/utils/register-tool.js";

const schema = z.object({
  id: z.string().uuid().describe("Identifier"),
  lang: z.enum(["de", "fr"]).default("de").describe("Language"),
  limit: z.number().int().optional(),
});

type Registered = {
  config: { name: string; description: string; inputSchema?: Record<string, unknown> };
  handler: (args: Record<string, unknown>) => unknown;
};

/** Minimal FastMCP stand-in that records what `tool()` receives. */
function fakeServer(): { server: FastMCP; registered: () => Registered } {
  let captured: Registered | undefined;
  const server = {
    tool: vi.fn((config: Registered["config"], handler: Registered["handler"]) => {
      captured = { config, handler };
    }),
  } as unknown as FastMCP;
  return {
    server,
    registered: () => {
      if (!captured) throw new Error("tool() was not called");
      return captured;
    },
  };
}

describe("formatValidationError", () => {
  it("lists every issue with its field path", () => {
    const parsed = schema.safeParse({ id: "nope", limit: 1.5 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const text = formatValidationError("my_tool", parsed.error);
    expect(text).toContain("Invalid arguments for tool my_tool:");
    expect(text).toMatch(/^- id: /m);
    expect(text).toMatch(/^- limit: /m);
  });

  it("uses (root) for issues without a path", () => {
    const parsed = z.object({}).strict().safeParse("not an object");
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(formatValidationError("t", parsed.error)).toContain("- (root): ");
  });
});

describe("registerTool", () => {
  it("passes name and description through to server.tool()", () => {
    const { server, registered } = fakeServer();
    registerTool(
      server,
      { name: "my_tool", description: "Does things", input: schema },
      () => "ok"
    );

    expect(server.tool).toHaveBeenCalledTimes(1);
    expect(registered().config.name).toBe("my_tool");
    expect(registered().config.description).toBe("Does things");
  });

  it("advertises an input-mode JSON Schema: defaulted fields are not required", () => {
    const { server, registered } = fakeServer();
    registerTool(
      server,
      { name: "my_tool", description: "d", input: schema },
      () => "ok"
    );

    const json = registered().config.inputSchema as {
      required?: string[];
      properties: Record<string, Record<string, unknown>>;
    };
    expect(json.required).toEqual(["id"]);
    expect(json.properties.lang).toMatchObject({
      default: "de",
      description: "Language",
    });
    expect(json.properties.id).toMatchObject({
      description: "Identifier",
      format: "uuid",
    });
  });

  it("does not hand FastMCP a Zod `input` (validation is done by the helper)", () => {
    const { server, registered } = fakeServer();
    registerTool(
      server,
      { name: "my_tool", description: "d", input: schema },
      () => "ok"
    );
    expect(registered().config).not.toHaveProperty("input");
  });

  it("applies defaults and forwards parsed params to the handler", async () => {
    const { server, registered } = fakeServer();
    const handler = vi.fn(
      async (params: z.output<typeof schema>) => `lang=${params.lang}`
    );
    registerTool(server, { name: "my_tool", description: "d", input: schema }, handler);

    const id = "123e4567-e89b-12d3-a456-426614174000";
    const out = await registered().handler({ id });

    expect(handler).toHaveBeenCalledWith({ id, lang: "de" });
    expect(out).toBe("lang=de");
  });

  it("returns an isError ToolResult with field paths on invalid input", async () => {
    const { server, registered } = fakeServer();
    const handler = vi.fn(() => "should not run");
    registerTool(server, { name: "my_tool", description: "d", input: schema }, handler);

    const out = await registered().handler({ id: "not-a-uuid", lang: "xx" });

    expect(handler).not.toHaveBeenCalled();
    expect(out).toBeInstanceOf(ToolResult);
    const result = (out as ToolResult).result;
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Invalid arguments for tool my_tool");
    expect(text).toMatch(/^- id: /m);
    expect(text).toMatch(/^- lang: /m);
  });

  it("returns a ToolResult from the handler untouched", async () => {
    const { server, registered } = fakeServer();
    const custom = new ToolResult({
      content: [{ type: "text", text: "custom" }],
      isError: true,
    });
    registerTool(
      server,
      { name: "my_tool", description: "d", input: schema },
      () => custom
    );

    const out = await registered().handler({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(out).toBe(custom);
  });
});
