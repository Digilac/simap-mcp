/**
 * Tests for get_publication_history tool
 */

import { describe, it, expect } from "vitest";
import { getPublicationHistoryInputSchema as schema } from "../../src/tools/organizations/get-publication-history.js";

describe("get_publication_history schema validation", () => {
  describe("publicationId parameter", () => {
    it("should accept valid UUID", () => {
      const result = schema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = schema.safeParse({ publicationId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = schema.safeParse({ publicationId: "" });
      expect(result.success).toBe(false);
    });

    it("should require publicationId", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("lotId parameter", () => {
    it("should accept valid UUID for lotId", () => {
      const result = schema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
        lotId: "660e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("should accept missing lotId", () => {
      const result = schema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for lotId", () => {
      const result = schema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
        lotId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("pubType label mapping", () => {
  /**
   * Maps pubType to a human-readable French label.
   */
  function getPubTypeLabel(pubType: string): string {
    const labels: Record<string, string> = {
      advance_notice: "Avis préalable",
      request_for_information: "Demande d'information",
      tender: "Appel d'offres",
      competition: "Concours",
      study_contract: "Contrat d'étude",
      award_tender: "Adjudication",
      award_study_contract: "Adjudication (étude)",
      award_competition: "Adjudication (concours)",
      direct_award: "Attribution directe",
      participant_selection: "Sélection des participants",
      selective_offering_phase: "Phase d'offre sélective",
      correction: "Correction",
      revocation: "Révocation",
      abandonment: "Abandon",
    };
    return labels[pubType] || pubType;
  }

  it("should map tender to Appel d'offres", () => {
    expect(getPubTypeLabel("tender")).toBe("Appel d'offres");
  });

  it("should map award_tender to Adjudication", () => {
    expect(getPubTypeLabel("award_tender")).toBe("Adjudication");
  });

  it("should map correction to Correction", () => {
    expect(getPubTypeLabel("correction")).toBe("Correction");
  });

  it("should return original value for unknown pubType", () => {
    expect(getPubTypeLabel("unknown_type")).toBe("unknown_type");
  });
});

describe("response formatting", () => {
  interface PastPublicationEntry {
    id: string;
    publicationDate: string;
    lotNumber?: number;
    projectType: string;
    projectSubType: string;
    processType: string;
    publicationNumber: string;
    pubType: string;
    corrected: boolean;
  }

  function getPubTypeLabel(pubType: string): string {
    const labels: Record<string, string> = {
      tender: "Appel d'offres",
      award_tender: "Adjudication",
      correction: "Correction",
    };
    return labels[pubType] || pubType;
  }

  /**
   * Helper function that mirrors the response formatting logic
   */
  function formatPublicationHistory(
    publications: PastPublicationEntry[]
  ): string {
    let result = `# Historique des publications\n\n`;
    result += `${publications.length} publication(s) antérieure(s).\n\n`;

    for (const pub of publications) {
      const typeLabel = getPubTypeLabel(pub.pubType);
      result += `## ${pub.publicationNumber} - ${typeLabel}\n\n`;
      result += `- **Date:** ${pub.publicationDate}\n`;
      result += `- **Type de projet:** ${pub.projectSubType}\n`;
      result += `- **Procédure:** ${pub.processType}\n`;
      if (pub.lotNumber !== undefined) {
        result += `- **Lot:** ${pub.lotNumber}\n`;
      }
      if (pub.corrected) {
        result += `- **Corrigé:** Oui\n`;
      }
      result += `- **ID:** \`${pub.id}\`\n`;
      result += "\n";
    }

    result += `*Utilisez get_tender_details avec l'ID de publication pour voir les détails complets.*`;

    return result;
  }

  it("should format single publication", () => {
    const publications: PastPublicationEntry[] = [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        publicationDate: "2024-01-15",
        projectType: "project",
        projectSubType: "service",
        processType: "open",
        publicationNumber: "SIMAP-2024-001",
        pubType: "tender",
        corrected: false,
      },
    ];

    const result = formatPublicationHistory(publications);

    expect(result).toContain("# Historique des publications");
    expect(result).toContain("1 publication(s) antérieure(s)");
    expect(result).toContain("SIMAP-2024-001 - Appel d'offres");
    expect(result).toContain("**Date:** 2024-01-15");
    expect(result).toContain("**Type de projet:** service");
    expect(result).toContain("**Procédure:** open");
  });

  it("should show lot number when present", () => {
    const publications: PastPublicationEntry[] = [
      {
        id: "123",
        publicationDate: "2024-01-15",
        projectType: "project",
        projectSubType: "construction",
        processType: "selective",
        publicationNumber: "SIMAP-2024-002",
        pubType: "award_tender",
        corrected: false,
        lotNumber: 3,
      },
    ];

    const result = formatPublicationHistory(publications);

    expect(result).toContain("**Lot:** 3");
  });

  it("should show corrected flag when true", () => {
    const publications: PastPublicationEntry[] = [
      {
        id: "123",
        publicationDate: "2024-01-15",
        projectType: "project",
        projectSubType: "supply",
        processType: "open",
        publicationNumber: "SIMAP-2024-003",
        pubType: "correction",
        corrected: true,
      },
    ];

    const result = formatPublicationHistory(publications);

    expect(result).toContain("**Corrigé:** Oui");
  });

  it("should format multiple publications", () => {
    const publications: PastPublicationEntry[] = [
      {
        id: "1",
        publicationDate: "2024-01-15",
        projectType: "project",
        projectSubType: "service",
        processType: "open",
        publicationNumber: "SIMAP-2024-001",
        pubType: "tender",
        corrected: false,
      },
      {
        id: "2",
        publicationDate: "2024-02-20",
        projectType: "project",
        projectSubType: "service",
        processType: "open",
        publicationNumber: "SIMAP-2024-001-A",
        pubType: "award_tender",
        corrected: false,
      },
    ];

    const result = formatPublicationHistory(publications);

    expect(result).toContain("2 publication(s) antérieure(s)");
    expect(result).toContain("SIMAP-2024-001 - Appel d'offres");
    expect(result).toContain("SIMAP-2024-001-A - Adjudication");
  });

  it("should include usage hint", () => {
    const publications: PastPublicationEntry[] = [
      {
        id: "123",
        publicationDate: "2024-01-15",
        projectType: "project",
        projectSubType: "service",
        processType: "open",
        publicationNumber: "SIMAP-2024-001",
        pubType: "tender",
        corrected: false,
      },
    ];

    const result = formatPublicationHistory(publications);

    expect(result).toContain("get_tender_details");
  });
});
