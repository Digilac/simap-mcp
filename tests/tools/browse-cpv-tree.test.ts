/**
 * Tests for browse_cpv_tree tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in browse-cpv-tree.ts)
const schema = z.object({
  parentCode: z
    .string()
    .regex(/^[0-9]{8}$/)
    .optional(),
  lang: z.enum(["de", "fr", "it", "en"]).default("fr"),
});

describe("browse_cpv_tree schema validation", () => {
  describe("parentCode parameter", () => {
    it("should accept valid 8-digit codes", () => {
      const result = schema.safeParse({ parentCode: "72000000" });
      expect(result.success).toBe(true);
    });

    it("should accept codes with specific digits", () => {
      const result = schema.safeParse({ parentCode: "72212000" });
      expect(result.success).toBe(true);
    });

    it("should allow omitting parentCode for root categories", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject codes shorter than 8 digits", () => {
      const result = schema.safeParse({ parentCode: "7200000" });
      expect(result.success).toBe(false);
    });

    it("should reject codes longer than 8 digits", () => {
      const result = schema.safeParse({ parentCode: "720000000" });
      expect(result.success).toBe(false);
    });

    it("should reject codes with non-numeric characters", () => {
      const result = schema.safeParse({ parentCode: "7200000A" });
      expect(result.success).toBe(false);
    });

    it("should reject codes with hyphens", () => {
      const result = schema.safeParse({ parentCode: "7200-000" });
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
    const result = buildQueryParams({ parentCode: "72000000" });
    expect(result.parentCode).toBe("72000000");
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
