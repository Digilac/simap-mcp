/**
 * End-to-end tests for the FastMCP server surface, driven through FastMCP's
 * in-process client (no stdio, no network).
 *
 * These guard the MCP contract that clients see: the 14 tool names, the
 * advertised `inputSchema` (defaults must not be `required`), the shape of
 * validation errors (tool results the model can read, not protocol errors),
 * and the simap-workflow Skill (MCP Skills extension).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@prefecthq/fastmcp-ts/client";
import { createServer } from "../src/server.js";
import { buildSimapWorkflowInstructions } from "../src/skills/simap-workflow.js";

const SKILLS_EXTENSION = "io.modelcontextprotocol/skills";
const SKILL_URI = "skill://simap-workflow/SKILL.md";

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

  it("advertises every tool as read-only with a human-readable title", async () => {
    const tools = await client.listTools();
    for (const tool of tools) {
      expect(tool.title, tool.name).toMatch(/^[A-Z][A-Za-z ]+$/);
      expect(tool.annotations, tool.name).toEqual({
        title: tool.title,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    }
  });

  it("advertises the expected required fields per tool", async () => {
    const tools = await client.listTools();
    const required = Object.fromEntries(
      tools.map((t) => [t.name, ((t.inputSchema as JsonSchema).required ?? []).sort()])
    );
    expect(required).toMatchObject({
      search_tenders: [],
      get_tender_details: ["projectId"],
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

  it("exposes the analyze_tender prompt with its arguments", async () => {
    const prompts = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["analyze_tender"]);
    expect(prompts[0].arguments).toEqual([
      expect.objectContaining({ name: "url", required: true }),
    ]);
  });

  it("renders analyze_tender from a simap.ch link as a single user message", async () => {
    const result = await client.getPrompt("analyze_tender", {
      url: "https://www.simap.ch/fr/project-detail/11111111-1111-4111-8111-111111111111",
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('projectId: "11111111-1111-4111-8111-111111111111"');
    expect(text).toContain('lang: "fr"');
  });

  it("rejects analyze_tender calls without a url", async () => {
    await expect(client.getPrompt("analyze_tender", {})).rejects.toThrow(/url/);
  });

  it("advertises the Skills extension", () => {
    expect(client.getServerCapabilities()?.extensions).toHaveProperty([SKILLS_EXTENSION]);
  });

  it("still exposes the Skill as a plain resource to clients without the extension", async () => {
    const resources = await client.listResources();
    expect(resources.map((r) => r.uri)).toEqual(
      expect.arrayContaining([SKILL_URI, "skill://simap-workflow/_manifest"])
    );
    const contents = await client.readResource(SKILL_URI);
    const text = (contents[0] as { text: string }).text;
    expect(text).toContain("name: simap-workflow\n");
    expect(text.endsWith(buildSimapWorkflowInstructions())).toBe(true);
  });
});

describe("simap MCP server Skills (modern connection)", () => {
  let client: Client;

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    client = await Client.connect(createServer(), {
      versionNegotiation: { mode: { pin: "2026-07-28" } },
      capabilities: { extensions: { [SKILLS_EXTENSION]: {} } },
    });
  });

  afterAll(async () => {
    await client.close();
    vi.restoreAllMocks();
  });

  it("lists exactly the simap-workflow Skill", async () => {
    expect(client.supportsSkills()).toBe(true);
    const skills = await client.listSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      uri: SKILL_URI,
      frontmatter: { name: "simap-workflow" },
    });
    expect(skills[0].frontmatter.description).toMatch(/simap\.ch/);
  });

  it("serves a verified SKILL.md whose body is the shared instructions", async () => {
    const { files } = await client.readSkill(SKILL_URI);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ uri: SKILL_URI, verified: true });
    expect(files[0].body).toBe(buildSimapWorkflowInstructions());
  });

  it("names every tool, and only tools that exist", async () => {
    const tools = (await client.listTools()).map((t) => t.name).sort();
    const body = buildSimapWorkflowInstructions();
    const referenced = [
      ...new Set(
        [...body.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)]
          .map((m) => m[1])
          .filter((name) => /^(search|get|list|browse)_/.test(name))
      ),
    ].sort();
    expect(referenced).toEqual(tools);
    expect(body).toContain("`analyze_tender`");
  });
});
