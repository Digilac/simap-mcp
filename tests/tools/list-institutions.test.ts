/**
 * Tests for list_institutions tool
 */

import { describe, it, expect } from "vitest";
import { listInstitutionsInputSchema as schema } from "../../src/tools/organizations/list-institutions.js";

describe("list_institutions schema validation", () => {
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

    it("should accept empty parameters (no search)", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe("filtering logic", () => {
  interface Translation {
    de?: string;
    fr?: string;
    it?: string;
    en?: string;
  }

  interface Institution {
    id: string;
    name: Translation;
    parentInstitutionId?: string | null;
  }

  /**
   * Helper function that mirrors the filtering logic (searches all languages)
   */
  function filterInstitutions(
    institutions: Institution[],
    search?: string
  ): Institution[] {
    if (!search) return institutions;

    const searchLower = search.toLowerCase();
    return institutions.filter((inst) => {
      const name = inst.name;
      if (!name) return false;
      return (
        name.de?.toLowerCase().includes(searchLower) ||
        name.fr?.toLowerCase().includes(searchLower) ||
        name.it?.toLowerCase().includes(searchLower) ||
        name.en?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  }

  it("should return all institutions when no search term", () => {
    const institutions: Institution[] = [
      { id: "1", name: { de: "Bund", fr: "Confédération" } },
      { id: "2", name: { de: "Kanton Bern", fr: "Canton de Berne" } },
    ];

    const result = filterInstitutions(institutions);
    expect(result).toHaveLength(2);
  });

  it("should filter by name case-insensitively across all languages", () => {
    const institutions: Institution[] = [
      { id: "1", name: { de: "Bund", fr: "Confédération" } },
      { id: "2", name: { de: "Kanton Bern", fr: "Canton de Berne" } },
      { id: "3", name: { de: "Stadt Zürich", fr: "Ville de Zurich" } },
    ];

    const result = filterInstitutions(institutions, "bern");
    expect(result).toHaveLength(1);
    expect(result[0].name.de).toBe("Kanton Bern");
  });

  it("should match French translation", () => {
    const institutions: Institution[] = [
      { id: "1", name: { de: "Bund", fr: "Confédération" } },
    ];

    const result = filterInstitutions(institutions, "confédération");
    expect(result).toHaveLength(1);
  });

  it("should return empty array when no match", () => {
    const institutions: Institution[] = [
      { id: "1", name: { de: "Bund", fr: "Confédération" } },
      { id: "2", name: { de: "Kanton Bern", fr: "Canton de Berne" } },
    ];

    const result = filterInstitutions(institutions, "xyz");
    expect(result).toHaveLength(0);
  });
});

describe("response formatting", () => {
  const MAX_RESULTS = 50;

  interface Translation {
    de?: string;
    fr?: string;
    it?: string;
    en?: string;
  }

  interface Institution {
    id: string;
    name: Translation;
    parentInstitutionId?: string | null;
  }

  function getTranslation(t: Translation, lang: string): string {
    return t[lang as keyof Translation] || t.de || t.fr || t.en || t.it || "";
  }

  /**
   * Helper function that mirrors the response formatting logic
   */
  function formatInstitutions(
    institutions: Institution[],
    lang: string = "fr",
    search?: string
  ): string {
    let result = search
      ? `# Institutions publiques pour "${search}"\n\n`
      : `# Institutions publiques\n\n`;

    result += `${institutions.length} institution(s) trouvée(s).\n\n`;

    const displayed = institutions.slice(0, MAX_RESULTS);
    for (const inst of displayed) {
      const name = getTranslation(inst.name, lang);
      result += `- **${name}** (ID: \`${inst.id}\`)`;
      if (inst.parentInstitutionId) {
        result += `\n  - Parent: \`${inst.parentInstitutionId}\``;
      }
      result += "\n";
    }

    if (institutions.length > MAX_RESULTS) {
      result += `\n*${institutions.length - MAX_RESULTS} institution(s) supplémentaire(s) non affichée(s). Utilisez le paramètre search pour filtrer.*`;
    }

    result += `\n\n*Utilisez ces IDs avec le paramètre issuedByOrganizations de search_tenders.*`;

    return result;
  }

  it("should format institutions with IDs", () => {
    const institutions: Institution[] = [
      { id: "123", name: { fr: "Test Institution" } },
    ];
    const result = formatInstitutions(institutions);

    expect(result).toContain("**Test Institution**");
    expect(result).toContain("`123`");
  });

  it("should show parent ID when available", () => {
    const institutions: Institution[] = [
      { id: "123", name: { fr: "Child" }, parentInstitutionId: "456" },
    ];
    const result = formatInstitutions(institutions);

    expect(result).toContain("Parent: `456`");
  });

  it("should limit results to 50", () => {
    const institutions: Institution[] = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      name: { fr: `Institution ${i}` },
    }));

    const result = formatInstitutions(institutions);

    expect(result).toContain("10 institution(s) supplémentaire(s)");
  });

  it("should include search term in header when provided", () => {
    const institutions: Institution[] = [{ id: "1", name: { fr: "Test" } }];
    const result = formatInstitutions(institutions, "fr", "Test");

    expect(result).toContain('# Institutions publiques pour "Test"');
  });

  it("should include usage hint", () => {
    const institutions: Institution[] = [{ id: "1", name: { fr: "Test" } }];
    const result = formatInstitutions(institutions);

    expect(result).toContain("issuedByOrganizations de search_tenders");
  });
});
