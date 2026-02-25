/**
 * Tests for search_proc_offices tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in search-proc-offices.ts)
const schema = z.object({
  search: z.string().min(3).optional(),
  institutionId: z.string().uuid().optional(),
});

describe("search_proc_offices schema validation", () => {
  describe("search parameter", () => {
    it("should accept valid search term", () => {
      const result = schema.safeParse({ search: "Bern" });
      expect(result.success).toBe(true);
    });

    it("should accept search terms with 3+ characters", () => {
      const result = schema.safeParse({ search: "abc" });
      expect(result.success).toBe(true);
    });

    it("should reject search terms shorter than 3 characters", () => {
      const result = schema.safeParse({ search: "ab" });
      expect(result.success).toBe(false);
    });

    it("should accept empty parameters", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("institutionId parameter", () => {
    it("should accept valid UUID", () => {
      const result = schema.safeParse({
        institutionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = schema.safeParse({ institutionId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("should accept both search and institutionId", () => {
      const result = schema.safeParse({
        search: "Gemeinde",
        institutionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("proc office type label mapping", () => {
  type ProcOfficeType =
    | "federal"
    | "cantonal"
    | "inter_cantonal"
    | "communal"
    | "other_communal"
    | "international";

  /**
   * Maps proc office type to a human-readable French label.
   */
  function getTypeLabel(type: ProcOfficeType): string {
    const labels: Record<ProcOfficeType, string> = {
      federal: "Fédéral",
      cantonal: "Cantonal",
      inter_cantonal: "Intercantonal",
      communal: "Communal",
      other_communal: "Autre communal",
      international: "International",
    };
    return labels[type] || type;
  }

  it("should map federal to Fédéral", () => {
    expect(getTypeLabel("federal")).toBe("Fédéral");
  });

  it("should map cantonal to Cantonal", () => {
    expect(getTypeLabel("cantonal")).toBe("Cantonal");
  });

  it("should map communal to Communal", () => {
    expect(getTypeLabel("communal")).toBe("Communal");
  });

  it("should map inter_cantonal to Intercantonal", () => {
    expect(getTypeLabel("inter_cantonal")).toBe("Intercantonal");
  });

  it("should map international to International", () => {
    expect(getTypeLabel("international")).toBe("International");
  });
});

describe("response formatting", () => {
  type ProcOfficeType =
    | "federal"
    | "cantonal"
    | "inter_cantonal"
    | "communal"
    | "other_communal"
    | "international";

  interface ProcOfficePublicData {
    id: string;
    name: string;
    type: ProcOfficeType;
    institutionId: string;
    compCentreId: string;
  }

  const MAX_RESULTS = 50;

  function getTypeLabel(type: ProcOfficeType): string {
    const labels: Record<ProcOfficeType, string> = {
      federal: "Fédéral",
      cantonal: "Cantonal",
      inter_cantonal: "Intercantonal",
      communal: "Communal",
      other_communal: "Autre communal",
      international: "International",
    };
    return labels[type] || type;
  }

  /**
   * Helper function that mirrors the response formatting logic
   */
  function formatProcOffices(
    procOffices: ProcOfficePublicData[],
    search?: string
  ): string {
    let result = search
      ? `# Bureaux d'achat pour "${search}"\n\n`
      : `# Bureaux d'achat\n\n`;

    result += `${procOffices.length} bureau(x) trouvé(s).\n\n`;

    const displayed = procOffices.slice(0, MAX_RESULTS);
    for (const office of displayed) {
      const typeLabel = getTypeLabel(office.type);
      result += `## ${office.name}\n\n`;
      result += `- **ID:** \`${office.id}\`\n`;
      result += `- **Type:** ${typeLabel}\n`;
      result += `- **Institution ID:** \`${office.institutionId}\`\n`;
      result += `- **Centre de compétence ID:** \`${office.compCentreId}\`\n`;
      result += "\n";
    }

    if (procOffices.length > MAX_RESULTS) {
      result += `\n*${procOffices.length - MAX_RESULTS} bureau(x) supplémentaire(s) non affiché(s). Affinez votre recherche.*`;
    }

    result += `\n*Utilisez ces IDs avec le paramètre issuedByOrganizations de search_tenders.*`;

    return result;
  }

  it("should format single proc office", () => {
    const procOffices: ProcOfficePublicData[] = [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Gemeinde Bargen",
        type: "communal",
        institutionId: "inst-123",
        compCentreId: "cc-456",
      },
    ];

    const result = formatProcOffices(procOffices);

    expect(result).toContain("# Bureaux d'achat");
    expect(result).toContain("1 bureau(x) trouvé(s)");
    expect(result).toContain("## Gemeinde Bargen");
    expect(result).toContain("**Type:** Communal");
  });

  it("should include search term in header when provided", () => {
    const procOffices: ProcOfficePublicData[] = [
      {
        id: "123",
        name: "Stadt Bern",
        type: "communal",
        institutionId: "inst-123",
        compCentreId: "cc-456",
      },
    ];

    const result = formatProcOffices(procOffices, "Bern");

    expect(result).toContain('# Bureaux d\'achat pour "Bern"');
  });

  it("should show all IDs", () => {
    const procOffices: ProcOfficePublicData[] = [
      {
        id: "office-123",
        name: "Test Office",
        type: "federal",
        institutionId: "inst-456",
        compCentreId: "cc-789",
      },
    ];

    const result = formatProcOffices(procOffices);

    expect(result).toContain("`office-123`");
    expect(result).toContain("`inst-456`");
    expect(result).toContain("`cc-789`");
  });

  it("should limit results to 50", () => {
    const procOffices: ProcOfficePublicData[] = Array.from(
      { length: 60 },
      (_, i) => ({
        id: String(i),
        name: `Office ${i}`,
        type: "cantonal" as ProcOfficeType,
        institutionId: `inst-${i}`,
        compCentreId: `cc-${i}`,
      })
    );

    const result = formatProcOffices(procOffices);

    expect(result).toContain("10 bureau(x) supplémentaire(s)");
  });

  it("should format multiple proc offices", () => {
    const procOffices: ProcOfficePublicData[] = [
      {
        id: "1",
        name: "Office Federal",
        type: "federal",
        institutionId: "i1",
        compCentreId: "c1",
      },
      {
        id: "2",
        name: "Office Cantonal",
        type: "cantonal",
        institutionId: "i2",
        compCentreId: "c2",
      },
    ];

    const result = formatProcOffices(procOffices);

    expect(result).toContain("2 bureau(x) trouvé(s)");
    expect(result).toContain("## Office Federal");
    expect(result).toContain("## Office Cantonal");
    expect(result).toContain("**Type:** Fédéral");
    expect(result).toContain("**Type:** Cantonal");
  });

  it("should include usage hint", () => {
    const procOffices: ProcOfficePublicData[] = [
      {
        id: "123",
        name: "Test",
        type: "communal",
        institutionId: "i1",
        compCentreId: "c1",
      },
    ];

    const result = formatProcOffices(procOffices);

    expect(result).toContain("issuedByOrganizations de search_tenders");
  });
});
