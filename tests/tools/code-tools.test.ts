/**
 * Handler tests for the eight nomenclature tools (search_* and browse_* for
 * CPV, BKP, NPK and OAG), driven through FastMCP's in-process client with a
 * stubbed `fetch`.
 *
 * They pin the exact Markdown each tool returns and the simap URL it calls,
 * so the four nomenclatures cannot drift apart unnoticed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@prefecthq/fastmcp-ts/client";

const API = "https://www.simap.ch/api";

interface CodeSystem {
  /** Lower-case key used in tool names and endpoints. */
  key: "cpv" | "bkp" | "npk" | "oag";
  /** Acronym used in the output. */
  name: "CPV" | "BKP" | "NPK" | "OAG";
  /** A parent code the browse tool accepts. */
  parentCode: string;
  /** A parent code the browse tool rejects. */
  invalidParentCode: string;
  /** Closing lines of a successful search. */
  searchFooter: string;
  /** Closing lines of a successful browse. */
  browseFooter: string;
}

const SYSTEMS: CodeSystem[] = [
  {
    key: "cpv",
    name: "CPV",
    parentCode: "72000000",
    invalidParentCode: "7200",
    searchFooter: "*Use these codes with the cpvCodes parameter of search_tenders.*",
    browseFooter: "*Use browse_cpv_tree with a parent code to see its subcategories.*",
  },
  {
    key: "bkp",
    name: "BKP",
    parentCode: "211.1",
    invalidParentCode: "1234",
    searchFooter: "*Use these codes with the bkpCodes parameter of search_tenders.*",
    browseFooter:
      "*Use browse_bkp_tree with a parent code to see its subcategories.*\n" +
      "*Use these codes with the bkpCodes parameter of search_tenders.*",
  },
  {
    key: "npk",
    name: "NPK",
    parentCode: "100",
    invalidParentCode: "1.1",
    searchFooter:
      "*NPK codes are used for standardized positions in construction tenders.*",
    browseFooter: "*Use browse_npk_tree with a parent code to see its subcategories.*",
  },
  {
    key: "oag",
    name: "OAG",
    parentCode: "1.10",
    invalidParentCode: "abc",
    searchFooter: "*OAG codes classify objects by type in construction projects.*",
    browseFooter: "*Use browse_oag_tree with a parent code to see its subcategories.*",
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * A search answer: the match sits three levels down, under its ancestors, as
 * simap returns it. A schema that keeps one level of children would drop it.
 */
const TREE = {
  codes: [
    {
      code: "100",
      label: { de: "Bau", fr: "Construction" },
      codes: [
        {
          code: "110",
          label: { de: "Rohbau", fr: "Gros œuvre" },
          codes: [{ code: "111", label: { de: "Betonbau", fr: "Béton" }, codes: [] }],
        },
      ],
    },
    { code: "200", label: { de: "Technik", fr: "Technique" }, codes: [] },
  ],
};

/** One level, as the list endpoints answer: parents are flagged, not nested. */
const LIST = {
  codes: [
    { code: "100", label: { de: "Bau", fr: "Construction" }, hasChildren: true },
    { code: "200", label: { de: "Technik", fr: "Technique" }, hasChildren: false },
  ],
};

describe.each(SYSTEMS)("$name code tools", (system) => {
  const { key, name } = system;
  const searchTool = `search_${key}_codes`;
  const browseTool = `browse_${key}_tree`;

  let client: Client;
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;

  /** Calls a tool and returns its text and error flag. */
  async function call(tool: string, args: Record<string, unknown>) {
    const result = await client.callToolRaw(tool, args);
    const [block] = result.content;
    if (block?.type !== "text") throw new Error("expected a text content block");
    return { text: block.text, isError: result.isError === true };
  }

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock = vi.fn<(url: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
    // A fresh module graph per test: the shared simap client caches reference
    // data for 24 hours, which would leak one test's response into the next.
    vi.resetModules();
    const { createServer } = await import("../../src/server.js");
    client = await Client.connect(createServer());
  });

  afterEach(async () => {
    await client.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe(searchTool, () => {
    it("lists the codes found, in the requested language", async () => {
      fetchMock.mockResolvedValue(jsonResponse(TREE));

      const { text, isError } = await call(searchTool, { query: "bau", lang: "fr" });

      expect(isError).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API}/codes/v1/${key}/search?query=bau&language=fr`
      );
      // simap nests the matches under their parents: every level must be listed.
      const expected =
        `# ${name} Codes for \`bau\`\n\n4 result(s) found.\n\n` +
        `- **100** - Construction\n- **110** - Gros œuvre\n- **111** - Béton\n` +
        `- **200** - Technique\n`;
      expect(text).toBe(`${expected}\n${system.searchFooter}`);
    });

    it("defaults to English and falls back to German labels", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ codes: [{ code: "100", label: { de: "Bau" } }] })
      );

      const { text } = await call(searchTool, { query: "bau" });

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API}/codes/v1/${key}/search?query=bau&language=en`
      );
      expect(text).toContain("- **100** - Bau\n");
    });

    it("says so when nothing matches, fencing backticks in the query", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ codes: [] }));

      const { text, isError } = await call(searchTool, { query: "a`b" });

      expect(isError).toBe(false);
      expect(text).toBe(`No ${name} codes found for \`\`a\`b\`\`.`);
    });

    it("returns a readable error when simap answers 404", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 404));

      const { text, isError } = await call(searchTool, { query: "bau" });

      expect(isError).toBe(true);
      expect(text).toContain(`searching ${name} codes`);
    });

    it("rejects an empty query without calling simap", async () => {
      const { text, isError } = await call(searchTool, { query: "" });

      expect(isError).toBe(true);
      expect(text).toContain(`Invalid arguments for tool ${searchTool}`);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe(browseTool, () => {
    it("lists the root categories and marks those with children", async () => {
      fetchMock.mockResolvedValue(jsonResponse(LIST));

      const { text, isError } = await call(browseTool, { lang: "de" });

      expect(isError).toBe(false);
      expect(fetchMock.mock.calls[0][0]).toBe(`${API}/codes/v1/${key}`);
      expect(text).toBe(
        `# Root ${name} Categories\n\n2 category(ies) found.\n\n` +
          `- **100** - Bau 📂\n- **200** - Technik\n\n${system.browseFooter}`
      );
    });

    it("lists the subcategories of a parent code", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ codes: [{ code: "110", label: { de: "Rohbau" } }] })
      );

      const { text } = await call(browseTool, { parentCode: system.parentCode });

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API}/codes/v1/${key}?parentCode=${system.parentCode}`
      );
      expect(text).toBe(
        `# ${name} Subcategories of \`${system.parentCode}\`\n\n1 category(ies) found.\n\n` +
          `- **110** - Rohbau\n\n${system.browseFooter}`
      );
    });

    it("says so when a parent code has no subcategories", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ codes: [] }));

      const { text, isError } = await call(browseTool, {
        parentCode: system.parentCode,
      });

      expect(isError).toBe(false);
      expect(text).toBe(
        `No ${name} subcategories found for code \`${system.parentCode}\`.`
      );
    });

    it("says so when there are no root categories", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ codes: [] }));

      const { text } = await call(browseTool, {});

      expect(text).toBe(`No root ${name} categories found.`);
    });

    it("returns a readable error when simap answers 404", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 404));

      const { text, isError } = await call(browseTool, {});

      expect(isError).toBe(true);
      expect(text).toContain(`browsing ${name} codes`);
    });

    it("rejects a malformed parent code without calling simap", async () => {
      const { text, isError } = await call(browseTool, {
        parentCode: system.invalidParentCode,
      });

      expect(isError).toBe(true);
      expect(text).toContain(`Invalid arguments for tool ${browseTool}`);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
