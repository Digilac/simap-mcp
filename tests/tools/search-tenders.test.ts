/**
 * Tests for search_tenders tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in search-tenders.ts)
const schema = z.object({
  search: z.string().optional(),
  publicationFrom: z.string().optional(),
  publicationUntil: z.string().optional(),
  projectSubTypes: z
    .array(
      z.enum([
        "construction",
        "service",
        "supply",
        "project_competition",
        "idea_competition",
        "overall_performance_competition",
        "project_study",
        "idea_study",
        "overall_performance_study",
        "request_for_information",
      ])
    )
    .optional(),
  cantons: z.array(z.string()).optional(),
  processTypes: z
    .array(z.enum(["open", "selective", "invitation", "direct", "no_process"]))
    .optional(),
  pubTypes: z
    .array(
      z.enum([
        "advance_notice",
        "request_for_information",
        "tender",
        "competition",
        "study_contract",
        "award_tender",
        "award_study_contract",
        "award_competition",
        "direct_award",
        "participant_selection",
        "selective_offering_phase",
        "correction",
        "revocation",
        "abandonment",
      ])
    )
    .optional(),
  cpvCodes: z.array(z.string().regex(/^[0-9]{8}$/)).optional(),
  bkpCodes: z.array(z.string().regex(/^[0-9]{1,3}(\.[0-9])?$/)).optional(),
  issuedByOrganizations: z.array(z.string().uuid()).optional(),
  lastItem: z.string().optional(),
  lang: z.enum(["de", "fr", "it", "en"]).default("fr"),
});

describe("search_tenders schema validation", () => {
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
    it("should accept pagination token", () => {
      const result = schema.safeParse({
        lastItem: "20260204|24568",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("lang parameter", () => {
    it("should default to fr", () => {
      const result = schema.parse({});
      expect(result.lang).toBe("fr");
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

describe("query parameter building", () => {
  /**
   * Helper function that mirrors the query building logic from search-tenders.ts
   */
  function buildQueryParams(params: {
    search?: string;
    publicationFrom?: string;
    publicationUntil?: string;
    projectSubTypes?: string[];
    cantons?: string[];
    processTypes?: string[];
    pubTypes?: string[];
    cpvCodes?: string[];
    bkpCodes?: string[];
    issuedByOrganizations?: string[];
    lastItem?: string;
  }): Record<string, string | string[] | undefined> {
    const queryParams: Record<string, string | string[] | undefined> = {};

    if (params.search && params.search.length >= 3) {
      queryParams.search = params.search;
    }
    if (params.publicationFrom) {
      queryParams.newestPublicationFrom = params.publicationFrom;
    }
    if (params.publicationUntil) {
      queryParams.newestPublicationUntil = params.publicationUntil;
    }
    if (params.projectSubTypes && params.projectSubTypes.length > 0) {
      queryParams.projectSubTypes = params.projectSubTypes;
    }
    if (params.cantons && params.cantons.length > 0) {
      queryParams.orderAddressCantons = params.cantons.map((c) => c.toUpperCase());
    }
    if (params.processTypes && params.processTypes.length > 0) {
      queryParams.processTypes = params.processTypes;
    }
    if (params.pubTypes && params.pubTypes.length > 0) {
      queryParams.newestPubTypes = params.pubTypes;
    }
    if (params.cpvCodes && params.cpvCodes.length > 0) {
      queryParams.cpvCodes = params.cpvCodes;
    }
    if (params.bkpCodes && params.bkpCodes.length > 0) {
      queryParams.bkpCodes = params.bkpCodes;
    }
    if (params.issuedByOrganizations && params.issuedByOrganizations.length > 0) {
      queryParams.issuedByOrganizations = params.issuedByOrganizations;
    }
    if (params.lastItem) {
      queryParams.lastItem = params.lastItem;
    }

    return queryParams;
  }

  it("should map processTypes correctly", () => {
    const result = buildQueryParams({ processTypes: ["open", "selective"] });
    expect(result.processTypes).toEqual(["open", "selective"]);
  });

  it("should map pubTypes to newestPubTypes", () => {
    const result = buildQueryParams({ pubTypes: ["tender", "award_tender"] });
    expect(result.newestPubTypes).toEqual(["tender", "award_tender"]);
  });

  it("should map cpvCodes correctly", () => {
    const result = buildQueryParams({ cpvCodes: ["72000000"] });
    expect(result.cpvCodes).toEqual(["72000000"]);
  });

  it("should map bkpCodes correctly", () => {
    const result = buildQueryParams({ bkpCodes: ["211"] });
    expect(result.bkpCodes).toEqual(["211"]);
  });

  it("should map issuedByOrganizations correctly", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = buildQueryParams({ issuedByOrganizations: [uuid] });
    expect(result.issuedByOrganizations).toEqual([uuid]);
  });

  it("should map lastItem correctly", () => {
    const result = buildQueryParams({ lastItem: "20260204|24568" });
    expect(result.lastItem).toBe("20260204|24568");
  });

  it("should uppercase canton codes", () => {
    const result = buildQueryParams({ cantons: ["vd", "ge"] });
    expect(result.orderAddressCantons).toEqual(["VD", "GE"]);
  });

  it("should ignore search terms shorter than 3 characters", () => {
    const result = buildQueryParams({ search: "ab" });
    expect(result.search).toBeUndefined();
  });

  it("should include search terms with 3+ characters", () => {
    const result = buildQueryParams({ search: "abc" });
    expect(result.search).toBe("abc");
  });
});
