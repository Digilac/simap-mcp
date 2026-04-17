/**
 * Tests for search_npk_codes tool
 */

import { describe, it, expect } from "vitest";
import { searchNpkCodesInputSchema as schema } from "../../src/tools/codes/search-npk-codes.js";

describe("search_npk_codes schema validation", () => {
  describe("query parameter", () => {
    it("should accept valid search queries", () => {
      const result = schema.safeParse({ query: "béton" });
      expect(result.success).toBe(true);
    });

    it("should accept numeric codes", () => {
      const result = schema.safeParse({ query: "123" });
      expect(result.success).toBe(true);
    });

    it("should accept alphanumeric codes", () => {
      const result = schema.safeParse({ query: "NPK123" });
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
    it("should default to en", () => {
      const result = schema.parse({ query: "test" });
      expect(result.lang).toBe("en");
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
    const result = buildQueryParams({ query: "béton", lang: "fr" });
    expect(result.query).toBe("béton");
  });

  it("should map language correctly", () => {
    const result = buildQueryParams({ query: "Beton", lang: "de" });
    expect(result.language).toBe("de");
  });
});
