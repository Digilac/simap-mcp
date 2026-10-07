/**
 * Tests for get_tender_details tool.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToolResult } from "@prefecthq/fastmcp-ts/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  getTenderDetailsInputSchema as schema,
  handler,
  resolveLatestPublicationId,
} from "../../src/tools/get-tender-details.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

/**
 * Loads a fixture file verbatim as `unknown` (no schema validation).
 * Useful when the handler test needs the raw payload exactly as the simap
 * API would return it, without ever coupling to the schema.
 */
function loadFixtureRaw(name: string): unknown {
  return JSON.parse(
    readFileSync(resolve(FIXTURES_DIR, name), "utf-8")
  ) as unknown;
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

const PROJECT_ID = "31367328-20d0-4786-acab-f0858c46dc82";
const PUBLICATION_ID = "14ae742d-ab60-4553-9b1e-9d1320fe18f7";

describe("get_tender_details schema validation", () => {
  it("should accept the minimal required input (projectId only)", () => {
    const result = schema.safeParse({ projectId: PROJECT_ID });
    expect(result.success).toBe(true);
  });

  it("should reject a non-UUID publicationId", () => {
    const result = schema.safeParse({ projectId: PROJECT_ID, publicationId: "nope" });
    expect(result.success).toBe(false);
  });

  it("should reject a non-UUID projectId", () => {
    const result = schema.safeParse({
      projectId: "not-a-uuid",
      publicationId: PUBLICATION_ID,
    });
    expect(result.success).toBe(false);
  });

  it("should default lang to en and fullRaw to false", () => {
    const result = schema.parse({
      projectId: PROJECT_ID,
      publicationId: PUBLICATION_ID,
    });
    expect(result.lang).toBe("en");
    expect(result.fullRaw).toBe(false);
  });

  it("should accept fullRaw: true", () => {
    const result = schema.parse({
      projectId: PROJECT_ID,
      publicationId: PUBLICATION_ID,
      fullRaw: true,
    });
    expect(result.fullRaw).toBe(true);
  });

  it("should reject a non-boolean fullRaw", () => {
    const result = schema.safeParse({
      projectId: PROJECT_ID,
      publicationId: PUBLICATION_ID,
      fullRaw: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("get_tender_details handler — fixture-driven", () => {
  const tender = loadFixtureRaw("publication-details-tender.json");

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Installs a `fetch` stub that returns the tender fixture for the
   * publication-details endpoint and a 404 for the project-header endpoint.
   * Exercises the handler's partial-response branch where only one of the
   * two parallel requests succeeds.
   */
  function stubFetchWithTender(): void {
    // Route fetch calls: project-header → 404, publication-details → fixture.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/publication-details/")) {
          return jsonResponse(tender);
        }
        if (url.includes("/project-header")) {
          return jsonResponse({ error: "not found" }, 404);
        }
        return jsonResponse({ error: "unexpected" }, 500);
      })
    );
  }

  it("should expose real structured fields and no truncation marker in default output", async () => {
    stubFetchWithTender();

    const text = await handler({
      projectId: PROJECT_ID,
      publicationId: PUBLICATION_ID,
      lang: "fr",
      fullRaw: false,
    });

    // Repro-case deadline and primary CPV must appear.
    expect(text).toContain("2026-03-05");
    expect(text).toContain("48000000");
    // Legacy section and truncation marker must be gone.
    expect(text).not.toContain("Raw Data (excerpt)");
    expect(text).not.toContain("(truncated)");
    // Default output does not include the verbose raw JSON section.
    expect(text).not.toContain("### Full Raw Response");
  });

  it("should append the complete untruncated JSON when fullRaw=true", async () => {
    stubFetchWithTender();

    const text = await handler({
      projectId: PROJECT_ID,
      publicationId: PUBLICATION_ID,
      lang: "fr",
      fullRaw: true,
    });

    expect(text).toContain("### Full Raw Response");
    expect(text).not.toContain("(truncated)");
    // The appended JSON must include every top-level key present in the
    // fixture (proving no truncation happened).
    for (const key of Object.keys(tender as Record<string, unknown>)) {
      expect(text).toContain(`"${key}"`);
    }
  });
});

describe("get_tender_details handler — without publicationId", () => {
  const tender = loadFixtureRaw("publication-details-tender.json");
  const header = {
    projectNumber: "15744",
    title: { de: "Aussengestaltung", en: null, fr: null, it: null },
    latestPublication: {
      id: PUBLICATION_ID,
      publicationNumber: "15744-01",
      publicationDate: "2026-02-01",
      pubType: "tender",
    },
    lots: [],
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubFetch(headerBody: unknown, headerStatus = 200): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/publication-details/")) return jsonResponse(tender);
      if (url.includes("/project-header")) return jsonResponse(headerBody, headerStatus);
      return jsonResponse({ error: "unexpected" }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("loads the latest publication from the project header", async () => {
    const fetchMock = stubFetch(header);

    const text = await handler({ projectId: PROJECT_ID, lang: "fr", fullRaw: false });

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((u) => u.includes(`/publication-details/${PUBLICATION_ID}`))).toBe(true);
    expect(text).toContain(`**Publication ID:** ${PUBLICATION_ID}`);
    expect(text).toContain("48000000");
  });

  it("returns an isError result when the project has no publication", async () => {
    stubFetch({ ...header, latestPublication: null });

    const result = await handler({ projectId: PROJECT_ID, lang: "en", fullRaw: false });

    expect(result).toBeInstanceOf(ToolResult);
    expect((result as ToolResult).result.isError).toBe(true);
    expect(JSON.stringify((result as ToolResult).result.content)).toContain("no publication yet");
  });

  it("returns a not-found error when the project does not exist", async () => {
    stubFetch({ error: "not found" }, 404);

    const result = await handler({ projectId: PROJECT_ID, lang: "en", fullRaw: false });

    expect(result).toBeInstanceOf(ToolResult);
    expect((result as ToolResult).result.isError).toBe(true);
    expect(JSON.stringify((result as ToolResult).result.content)).toMatch(/not found/i);
  });
});

describe("resolveLatestPublicationId", () => {
  it("uses the project-level latest publication when present", () => {
    expect(resolveLatestPublicationId({ latestPublication: { id: "project-pub" } })).toBe(
      "project-pub"
    );
  });

  it("falls back to the most recent lot publication for projects with lots", () => {
    expect(
      resolveLatestPublicationId({
        latestPublication: null,
        lots: [
          { lotNumber: 1, latestPublication: { id: "old", dates: { publicationDate: "2026-09-01" } } },
          { lotNumber: 2, latestPublication: { id: "new", dates: { publicationDate: "2026-10-06" } } },
          { lotNumber: 3, latestPublication: null },
        ],
      })
    ).toBe("new");
  });

  it("returns undefined when neither the project nor its lots have a publication", () => {
    expect(resolveLatestPublicationId({ latestPublication: null, lots: [] })).toBeUndefined();
  });
});
