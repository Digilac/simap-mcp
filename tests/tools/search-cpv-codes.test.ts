/**
 * Tests for search_cpv_codes tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in search-cpv-codes.ts)
const schema = z.object({
  query: z.string().min(1),
  lang: z.enum(["de", "fr", "it", "en"]).default("fr"),
});

describe("search_cpv_codes schema validation", () => {
  describe("query parameter", () => {
    it("should accept valid search queries", () => {
      const result = schema.safeParse({ query: "informatique" });
      expect(result.success).toBe(true);
    });

    it("should accept numeric codes", () => {
      const result = schema.safeParse({ query: "72000000" });
      expect(result.success).toBe(true);
    });

    it("should accept partial codes", () => {
      const result = schema.safeParse({ query: "720" });
      expect(result.success).toBe(true);
    });

    it("should reject empty query", () => {
      const result = schema.safeParse({ query: "" });
      expect(result.success).toBe(false);
    });

    it("should require query parameter", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("lang parameter", () => {
    it("should default to fr", () => {
      const result = schema.parse({ query: "test" });
      expect(result.lang).toBe("fr");
    });

    it("should accept all valid languages", () => {
      for (const lang of ["de", "fr", "it", "en"]) {
        const result = schema.safeParse({ query: "test", lang });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid languages", () => {
      const result = schema.safeParse({ query: "test", lang: "es" });
      expect(result.success).toBe(false);
    });
  });
});

describe("query parameter building", () => {
  /**
   * Helper function that mirrors the query building logic
   */
  function buildQueryParams(params: { query: string; lang: string }): Record<string, string> {
    return {
      query: params.query,
      language: params.lang,
    };
  }

  it("should map query correctly", () => {
    const result = buildQueryParams({ query: "informatique", lang: "fr" });
    expect(result.query).toBe("informatique");
  });

  it("should map language correctly", () => {
    const result = buildQueryParams({ query: "IT", lang: "de" });
    expect(result.language).toBe("de");
  });
});
