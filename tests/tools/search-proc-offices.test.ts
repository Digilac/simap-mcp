/**
 * Tests for search_proc_offices tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToolResult } from "@prefecthq/fastmcp-ts/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  searchProcOfficesInputSchema as schema,
  formatProcOffices,
  getProcOfficeTypeLabel,
  handler,
} from "../../src/tools/organizations/search-proc-offices.js";
import type { ProcOfficePublicData } from "../../src/types/api.js";
import { ProcOfficesPublicResponseSchema } from "../../src/types/schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(__dirname, "../fixtures/proc-offices-mixed-types.json");

/**
 * Real `/procoffices/v1/po/public?search=Zürich` offices (one per type seen
 * on 2026-11-27) plus one synthetic office with a type simap doesn't return
 * yet.
 */
function loadFixture(): { procOffices: ProcOfficePublicData[] } {
  return JSON.parse(readFileSync(FIXTURE, "utf-8")) as {
    procOffices: ProcOfficePublicData[];
  };
}

/**
 * Builds a minimal `Response` stub with a JSON body for `fetch` mocks.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function office(overrides: Partial<ProcOfficePublicData> = {}): ProcOfficePublicData {
  return {
    id: "office-123",
    name: "Test Office",
    type: "communal",
    institutionId: "inst-456",
    compCentreId: "cc-789",
    ...overrides,
  };
}

describe("search_proc_offices schema validation", () => {
  describe("search parameter", () => {
    it("should accept valid search term", () => {
      const result = schema.safeParse({ search: "Bern" });
      expect(result.success).toBe(true);
    });

    it("should accept search terms with 3+ characters", () => {
      const result = schema.safeParse({ search: "abc" });
      expect(result.success).toBe(true);
    });

    it("should reject search terms shorter than 3 characters", () => {
      const result = schema.safeParse({ search: "ab" });
      expect(result.success).toBe(false);
    });

    it("should accept empty parameters", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("institutionId parameter", () => {
    it("should accept valid UUID", () => {
      const result = schema.safeParse({
        institutionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = schema.safeParse({ institutionId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("should accept both search and institutionId", () => {
      const result = schema.safeParse({
        search: "Gemeinde",
        institutionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("proc office response schema", () => {
  it("should accept a response whose offices use types missing from the label list", () => {
    const result = ProcOfficesPublicResponseSchema.safeParse(loadFixture());
    expect(result.success).toBe(true);
  });

  it("should still reject an office without a string type", () => {
    const result = ProcOfficesPublicResponseSchema.safeParse({
      procOffices: [{ ...office(), type: 42 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("proc office type label mapping", () => {
  it.each([
    ["federal", "Federal"],
    ["central_federation", "Federal (central administration)"],
    ["decentral_federation", "Federal (decentralised administration)"],
    ["other_federation", "Other federal"],
    ["cantonal", "Cantonal"],
    ["other_cantonal", "Other cantonal"],
    ["inter_cantonal", "Inter-cantonal"],
    ["communal", "Communal"],
    ["other_communal", "Other communal"],
    ["international", "International"],
  ])("should map %s to %s", (type, label) => {
    expect(getProcOfficeTypeLabel(type)).toBe(label);
  });

  it("should show an unknown type as-is in inline code", () => {
    expect(getProcOfficeTypeLabel("future_office_type")).toBe("`future_office_type`");
  });

  it("should not resolve Object.prototype keys as labels", () => {
    expect(getProcOfficeTypeLabel("constructor")).toBe("`constructor`");
  });
});

describe("response formatting", () => {
  it("should format a single proc office with all IDs", () => {
    const result = formatProcOffices([office()]);

    expect(result).toContain("# Procurement Offices\n");
    expect(result).toContain("1 office(s) found");
    expect(result).toContain("## Test Office");
    expect(result).toContain("**Type:** Communal");
    expect(result).toContain("`office-123`");
    expect(result).toContain("`inst-456`");
    expect(result).toContain("`cc-789`");
  });

  it("should include the search term in the header when provided", () => {
    const result = formatProcOffices([office()], "Bern");
    expect(result).toContain("# Procurement Offices for `Bern`");
  });

  it("should limit results to 50", () => {
    const offices = Array.from({ length: 60 }, (_, i) =>
      office({ id: String(i), name: `Office ${i}` })
    );

    const result = formatProcOffices(offices);

    expect(result).toContain("60 office(s) found");
    expect(result).toContain("## Office 49");
    expect(result).not.toContain("## Office 50");
    expect(result).toContain("10 additional office(s) not displayed");
  });

  it("should include the usage hint", () => {
    const result = formatProcOffices([office()]);
    expect(result).toContain("issuedByOrganizations parameter of search_tenders");
  });
});

describe("search_proc_offices handler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should list every office when simap returns new or unknown types (#144)", async () => {
    const fetchMock = vi.fn(async (_input: string | URL) => jsonResponse(loadFixture()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await handler({ search: "Zürich" });

    expect(typeof result).toBe("string");
    const text = result as string;
    expect(text).toContain("8 office(s) found");
    expect(text).toContain("**Type:** Other cantonal");
    expect(text).toContain("**Type:** Other federal");
    expect(text).toContain("**Type:** Federal (central administration)");
    expect(text).toContain("**Type:** Federal (decentralised administration)");
    expect(text).toContain("**Type:** `future_office_type`");
    expect(text).toContain("`00000000-0000-4000-8000-000000000144`");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/procoffices/v1/po/public");
    expect(url.searchParams.get("search")).toBe("Zürich");
  });

  it("should require search or institutionId", async () => {
    const result = await handler({});
    expect(result).toBeInstanceOf(ToolResult);
    expect((result as ToolResult).result.isError).toBe(true);
  });
});
