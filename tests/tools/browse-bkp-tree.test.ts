/**
 * Tests for browse_bkp_tree tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in browse-bkp-tree.ts)
const schema = z.object({
  parentCode: z.string().regex(/^[0-9]{1,3}(\.[0-9])?$/).optional(),
  lang: z.enum(["de", "fr", "it", "en"]).default("fr"),
});

describe("browse_bkp_tree schema validation", () => {
  describe("parentCode parameter", () => {
    it("should accept valid BKP codes", () => {
      const result = schema.safeParse({ parentCode: "2" });
      expect(result.success).toBe(true);
    });

    it("should accept multi-digit codes", () => {
      const result = schema.safeParse({ parentCode: "211" });
      expect(result.success).toBe(true);
    });

    it("should accept codes with decimals", () => {
      const result = schema.safeParse({ parentCode: "211.1" });
      expect(result.success).toBe(true);
    });

    it("should allow omitting parentCode for root categories", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should allow empty object", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.parentCode).toBeUndefined();
    });

    it("should reject non-numeric codes", () => {
      const result = schema.safeParse({ parentCode: "abc" });
      expect(result.success).toBe(false);
    });

    it("should reject codes with more than 3 digits", () => {
      const result = schema.safeParse({ parentCode: "1234" });
      expect(result.success).toBe(false);
    });
  });

  describe("lang parameter", () => {
    it("should default to fr", () => {
      const result = schema.parse({});
      expect(result.lang).toBe("fr");
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
    const result = buildQueryParams({ parentCode: "2" });
    expect(result.parentCode).toBe("2");
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
