/**
 * Tests for search_tenders tool
 */

import { describe, it, expect } from "vitest";
import { searchTendersInputSchema as schema } from "../../src/tools/search-tenders.js";
import type { SearchTendersInput } from "../../src/tools/search-tenders.js";
import { buildTenderSearchQuery } from "../../src/tools/search-tenders-params.js";

/** Minimal factory for SearchTendersInput — lang is required in the inferred type. */
function input(partial: Partial<SearchTendersInput> = {}): SearchTendersInput {
  return { lang: "en", ...partial };
}

describe("search_tenders schema validation", () => {
  describe("search parameter", () => {
    it("should accept valid search strings", () => {
      const result = schema.safeParse({ search: "informatique" });
      expect(result.success).toBe(true);
    });

    it("should reject strings exceeding max length", () => {
      const result = schema.safeParse({ search: "a".repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe("publicationFrom parameter", () => {
    it("should accept valid YYYY-MM-DD dates", () => {
      const result = schema.safeParse({ publicationFrom: "2026-01-15" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid date formats", () => {
      expect(schema.safeParse({ publicationFrom: "2026/01/15" }).success).toBe(false);
      expect(schema.safeParse({ publicationFrom: "not-a-date" }).success).toBe(false);
      expect(schema.safeParse({ publicationFrom: "20260115" }).success).toBe(false);
    });
  });

  describe("publicationUntil parameter", () => {
    it("should accept valid YYYY-MM-DD dates", () => {
      const result = schema.safeParse({ publicationUntil: "2026-12-31" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid date formats", () => {
      expect(schema.safeParse({ publicationUntil: "31-12-2026" }).success).toBe(false);
    });
  });

  describe("cantons parameter", () => {
    it("should accept valid Swiss canton codes", () => {
      const result = schema.safeParse({ cantons: ["VD", "GE", "ZH"] });
      expect(result.success).toBe(true);
    });

    it("should reject invalid canton codes", () => {
      const result = schema.safeParse({ cantons: ["XX"] });
      expect(result.success).toBe(false);
    });
  });

  describe("array length limits", () => {
    it("should reject cpvCodes exceeding max length", () => {
      const codes = Array.from({ length: 51 }, (_, i) => String(i).padStart(8, "0"));
      const result = schema.safeParse({ cpvCodes: codes });
      expect(result.success).toBe(false);
    });

    it("should reject issuedByOrganizations exceeding max length", () => {
      const uuids = Array.from({ length: 51 }, () => "123e4567-e89b-12d3-a456-426614174000");
      const result = schema.safeParse({ issuedByOrganizations: uuids });
      expect(result.success).toBe(false);
    });

    it("should reject projectSubTypes exceeding max length", () => {
      const types = Array.from({ length: 11 }, () => "construction");
      const result = schema.safeParse({ projectSubTypes: types });
      expect(result.success).toBe(false);
    });

    it("should reject processTypes exceeding max length", () => {
      const types = Array.from({ length: 6 }, () => "open");
      const result = schema.safeParse({ processTypes: types });
      expect(result.success).toBe(false);
    });

    it("should reject pubTypes exceeding max length", () => {
      const types = Array.from({ length: 15 }, () => "tender");
      const result = schema.safeParse({ pubTypes: types });
      expect(result.success).toBe(false);
    });

    it("should reject bkpCodes exceeding max length", () => {
      const codes = Array.from({ length: 51 }, (_, i) => String(i + 1));
      const result = schema.safeParse({ bkpCodes: codes });
      expect(result.success).toBe(false);
    });

    it("should reject cantons exceeding max length", () => {
      const cantons = Array.from({ length: 27 }, () => "ZH");
      const result = schema.safeParse({ cantons: cantons });
      expect(result.success).toBe(false);
    });
  });

  describe("processTypes parameter", () => {
    it("should accept valid process types", () => {
      const result = schema.safeParse({
        processTypes: ["open", "selective"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid process types", () => {
      const result = schema.safeParse({
        processTypes: ["invalid_type"],
      });
      expect(result.success).toBe(false);
    });

    it("should accept all valid process types", () => {
      const result = schema.safeParse({
        processTypes: ["open", "selective", "invitation", "direct", "no_process"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("pubTypes parameter", () => {
    it("should accept valid publication types", () => {
      const result = schema.safeParse({
        pubTypes: ["tender", "award_tender"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid publication types", () => {
      const result = schema.safeParse({
        pubTypes: ["invalid_pub_type"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cpvCodes parameter", () => {
    it("should accept valid 8-digit CPV codes", () => {
      const result = schema.safeParse({
        cpvCodes: ["72000000", "45000000"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject CPV codes with wrong length", () => {
      const result = schema.safeParse({
        cpvCodes: ["7200000"], // 7 digits
      });
      expect(result.success).toBe(false);
    });

    it("should reject CPV codes with non-numeric characters", () => {
      const result = schema.safeParse({
        cpvCodes: ["7200000A"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bkpCodes parameter", () => {
    it("should accept valid BKP codes", () => {
      const result = schema.safeParse({
        bkpCodes: ["211", "21.1", "1", "123"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid BKP codes", () => {
      const result = schema.safeParse({
        bkpCodes: ["1234"], // 4 digits not allowed
      });
      expect(result.success).toBe(false);
    });
  });

  describe("issuedByOrganizations parameter", () => {
    it("should accept valid UUIDs", () => {
      const result = schema.safeParse({
        issuedByOrganizations: ["123e4567-e89b-12d3-a456-426614174000"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      const result = schema.safeParse({
        issuedByOrganizations: ["not-a-uuid"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("lastItem parameter", () => {
    it("should accept valid pagination token", () => {
      const result = schema.safeParse({
        lastItem: "20260204|24568",
      });
      expect(result.success).toBe(true);
    });

    it("should reject malformed pagination tokens", () => {
      expect(schema.safeParse({ lastItem: "invalid" }).success).toBe(false);
      expect(schema.safeParse({ lastItem: "2026-02-04|24568" }).success).toBe(false);
      expect(schema.safeParse({ lastItem: "12345|" }).success).toBe(false);
    });
  });

  describe("lang parameter", () => {
    it("should default to en", () => {
      const result = schema.parse({});
      expect(result.lang).toBe("en");
    });

    it("should accept valid languages", () => {
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

  describe("combined parameters", () => {
    it("should accept multiple valid parameters together", () => {
      const result = schema.safeParse({
        search: "informatique",
        publicationFrom: "2026-01-01",
        publicationUntil: "2026-12-31",
        projectSubTypes: ["service", "supply"],
        cantons: ["VD", "GE"],
        processTypes: ["open"],
        pubTypes: ["tender"],
        cpvCodes: ["72000000"],
        lang: "fr",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("query parameter building (buildTenderSearchQuery)", () => {
  it("should map processTypes correctly", () => {
    const result = buildTenderSearchQuery(input({ processTypes: ["open", "selective"] }));
    expect(result.processTypes).toEqual(["open", "selective"]);
  });

  it("should map pubTypes to newestPubTypes", () => {
    const result = buildTenderSearchQuery(input({ pubTypes: ["tender", "award_tender"] }));
    expect(result.newestPubTypes).toEqual(["tender", "award_tender"]);
  });

  it("should map cpvCodes correctly", () => {
    const result = buildTenderSearchQuery(input({ cpvCodes: ["72000000"] }));
    expect(result.cpvCodes).toEqual(["72000000"]);
  });

  it("should map bkpCodes correctly", () => {
    const result = buildTenderSearchQuery(input({ bkpCodes: ["211"] }));
    expect(result.bkpCodes).toEqual(["211"]);
  });

  it("should map issuedByOrganizations correctly", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = buildTenderSearchQuery(input({ issuedByOrganizations: [uuid] }));
    expect(result.issuedByOrganizations).toEqual([uuid]);
  });

  it("should map lastItem correctly", () => {
    const result = buildTenderSearchQuery(input({ lastItem: "20260204|24568" }));
    expect(result.lastItem).toBe("20260204|24568");
  });

  it("should uppercase canton codes", () => {
    const result = buildTenderSearchQuery(input({ cantons: ["VD", "GE"] }));
    expect(result.orderAddressCantons).toEqual(["VD", "GE"]);
  });

  it("should map publicationFrom to newestPublicationFrom", () => {
    const result = buildTenderSearchQuery(input({ publicationFrom: "2026-01-15" }));
    expect(result.newestPublicationFrom).toBe("2026-01-15");
  });

  it("should skip empty arrays", () => {
    const result = buildTenderSearchQuery(input({ cpvCodes: [], cantons: [] }));
    expect(result.cpvCodes).toBeUndefined();
    expect(result.orderAddressCantons).toBeUndefined();
  });

  it("should default to today when no filters are provided", () => {
    const result = buildTenderSearchQuery(input());
    const today = new Date().toISOString().split("T")[0];
    expect(result.newestPublicationFrom).toBe(today);
  });

  it("should not inject today's default when any filter is set", () => {
    const result = buildTenderSearchQuery(input({ search: "abc" }));
    expect(result.newestPublicationFrom).toBeUndefined();
    expect(result.search).toBe("abc");
  });
});
