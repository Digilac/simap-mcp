/**
 * End-to-end tests for the FastMCP server surface, driven through FastMCP's
 * in-process client (no stdio, no network).
 *
 * These guard the MCP contract that clients see: the 14 tool names, the
 * advertised `inputSchema` (defaults must not be `required`), and the shape of
 * validation errors (tool results the model can read, not protocol errors).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@prefecthq/fastmcp-ts/client";
import { createServer } from "../src/server.js";

const EXPECTED_TOOLS = [
  "search_tenders",
  "get_tender_details",
  "search_cpv_codes",
  "list_cantons",
  "search_bkp_codes",
  "search_npk_codes",
  "search_oag_codes",
  "browse_cpv_tree",
  "browse_bkp_tree",
  "browse_npk_tree",
  "browse_oag_tree",
  "list_institutions",
  "get_publication_history",
  "search_proc_offices",
].sort();

type JsonSchema = { required?: string[]; properties?: Record<string, unknown> };

describe("simap MCP server (FastMCP)", () => {
  let client: Client;

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    client = await Client.connect(createServer());
  });

  afterAll(async () => {
    await client.close();
    vi.restoreAllMocks();
  });

  it("exposes exactly the 14 documented tools", async () => {
    const tools = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it("never advertises defaulted fields (lang, fullRaw) as required", async () => {
    const tools = await client.listTools();
    for (const tool of tools) {
      const schema = tool.inputSchema as JsonSchema;
      const required = schema.required ?? [];
      expect(required, tool.name).not.toContain("lang");
      expect(required, tool.name).not.toContain("fullRaw");
    }
  });

  it("advertises the expected required fields per tool", async () => {
    const tools = await client.listTools();
    const required = Object.fromEntries(
      tools.map((t) => [t.name, ((t.inputSchema as JsonSchema).required ?? []).sort()])
    );
    expect(required).toMatchObject({
      search_tenders: [],
      get_tender_details: ["projectId", "publicationId"],
      search_cpv_codes: ["query"],
      search_bkp_codes: ["query"],
      search_npk_codes: ["query"],
      search_oag_codes: ["query"],
      list_cantons: [],
      browse_cpv_tree: [],
      list_institutions: [],
      get_publication_history: ["publicationId"],
      search_proc_offices: [],
    });
  });

  it("keeps field descriptions and defaults in the advertised schema", async () => {
    const tools = await client.listTools();
    const details = tools.find((t) => t.name === "get_tender_details");
    const props = (details?.inputSchema as JsonSchema).properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(props.projectId).toMatchObject({
      format: "uuid",
      description: "Project ID (UUID)",
    });
    expect(props.lang).toMatchObject({ default: "en", enum: ["de", "fr", "it", "en"] });
    expect(props.fullRaw).toMatchObject({ type: "boolean", default: false });
  });

  it("returns invalid arguments as an isError tool result that names the fields", async () => {
    const result = await client.callToolRaw("get_tender_details", {
      projectId: "not-a-uuid",
      publicationId: "nope",
    });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Invalid arguments for tool get_tender_details");
    expect(text).toMatch(/^- projectId: /m);
    expect(text).toMatch(/^- publicationId: /m);
  });

  it("reports missing required arguments by name", async () => {
    const result = await client.callToolRaw("search_cpv_codes", {});
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/^- query: /m);
  });

  it("returns application-level validation as an isError tool result", async () => {
    const result = await client.callToolRaw("search_proc_offices", {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain(
      "Please provide at least one parameter"
    );
  });
});
