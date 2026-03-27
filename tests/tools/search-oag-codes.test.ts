/**
 * Tests for search_oag_codes tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in search-oag-codes.ts)
const schema = z.object({
  query: z.string().min(1).max(500),
  lang: z.enum(["de", "fr", "it", "en"]).default("fr"),
});

describe("search_oag_codes schema validation", () => {
  describe("query parameter", () => {
    it("should accept valid search queries", () => {
      const result = schema.safeParse({ query: "bâtiment" });
      expect(result.success).toBe(true);
    });

    it("should accept numeric codes", () => {
      const result = schema.safeParse({ query: "100" });
      expect(result.success).toBe(true);
    });

    it("should accept alphanumeric codes", () => {
      const result = schema.safeParse({ query: "OAG100" });
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

    it("should reject query exceeding max length", () => {
      const result = schema.safeParse({ query: "a".repeat(501) });
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
  function buildQueryParams(params: { query: string; lang: string }): Record<string, string> {
    return {
      query: params.query,
      language: params.lang,
    };
  }

  it("should map query correctly", () => {
    const result = buildQueryParams({ query: "bâtiment", lang: "fr" });
    expect(result.query).toBe("bâtiment");
  });

  it("should map language correctly", () => {
    const result = buildQueryParams({ query: "Gebäude", lang: "de" });
    expect(result.language).toBe("de");
  });
});
