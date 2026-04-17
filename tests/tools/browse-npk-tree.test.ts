/**
 * Tests for browse_npk_tree tool
 */

import { describe, it, expect } from "vitest";
import { browseNpkTreeInputSchema as schema } from "../../src/tools/codes/browse-npk-tree.js";

describe("browse_npk_tree schema validation", () => {
  describe("parentCode parameter", () => {
    it("should accept valid NPK codes", () => {
      const result = schema.safeParse({ parentCode: "100" });
      expect(result.success).toBe(true);
    });

    it("should accept multi-digit codes", () => {
      const result = schema.safeParse({ parentCode: "12345" });
      expect(result.success).toBe(true);
    });

    it("allows omitting parentCode for root categories (empty object)", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.parentCode).toBeUndefined();
    });

    it("should reject non-numeric codes", () => {
      const result = schema.safeParse({ parentCode: "abc" });
      expect(result.success).toBe(false);
    });

    it("should reject codes with decimal points", () => {
      const result = schema.safeParse({ parentCode: "123.45" });
      expect(result.success).toBe(false);
    });
  });

  describe("lang parameter", () => {
    it("should default to en", () => {
      const result = schema.parse({});
      expect(result.lang).toBe("en");
    });

    it("should accept all valid languages", () => {
      for (const lang of ["de", "fr", "it", "en"]) {
        const result = schema.safeParse({ lang });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid languages", () => {
      const result = schema.safeParse({ lang: "es" });
      expect(result.success).toBe(false);
    });
  });
});

describe("query parameter building", () => {
  function buildQueryParams(params: { parentCode?: string }): Record<string, string> {
    const result: Record<string, string> = {};
    if (params.parentCode) {
      result.parentCode = params.parentCode;
    }
    return result;
  }

  it("should include parentCode when provided", () => {
    const result = buildQueryParams({ parentCode: "100" });
    expect(result.parentCode).toBe("100");
  });

  it("should not include parentCode when omitted", () => {
    const result = buildQueryParams({});
    expect(result.parentCode).toBeUndefined();
  });

  it("should return empty object for root categories", () => {
    const result = buildQueryParams({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
