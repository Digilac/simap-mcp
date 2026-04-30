/**
 * Tests for search_cpv_codes tool
 */

import { describe, it, expect, vi } from "vitest";
import type { Translation } from "../../src/types/common.js";
import type { Language } from "../../src/types/common.js";
import { searchCpvCodesInputSchema as schema } from "../../src/tools/codes/search-cpv-codes.js";
import { formatInlineCode } from "../../src/utils/formatting.js";

describe("search_cpv_codes schema validation", () => {
  describe("query parameter", () => {
    it("should accept valid search queries", () => {
      const result = schema.safeParse({ query: "informatique" });
      expect(result.success).toBe(true);
    });

    it("should accept numeric codes", () => {
      const result = schema.safeParse({ query: "72000000" });
      expect(result.success).toBe(true);
    });

    it("should accept partial codes", () => {
      const result = schema.safeParse({ query: "720" });
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
  /**
   * Helper function that mirrors the query building logic
   */
  function buildQueryParams(params: { query: string; lang: string }): Record<string, string> {
    return {
      query: params.query,
      language: params.lang,
    };
  }

  it("should map query correctly", () => {
    const result = buildQueryParams({ query: "informatique", lang: "fr" });
    expect(result.query).toBe("informatique");
  });

  it("should map language correctly", () => {
    const result = buildQueryParams({ query: "IT", lang: "de" });
    expect(result.language).toBe("de");
  });
});

describe("response formatting", () => {
  interface CPVCode {
    code: string;
    label: Translation;
    codes?: CPVCode[] | null;
  }

  /**
   * Mirrors the getTranslation() logic from src/utils/translation.ts.
   * Can be replaced with a mock to test multilingual behavior.
   */
  let getTranslationFn = (t: Translation | null | undefined, lang: Language): string => {
    if (!t) return "";
    return t[lang] || t.de || t.fr || t.en || t.it || "";
  };

  function flattenCodes(codes: CPVCode[], result: CPVCode[] = []): CPVCode[] {
    for (const code of codes) {
      result.push(code);
      if (code.codes && code.codes.length > 0) {
        flattenCodes(code.codes, result);
      }
    }
    return result;
  }

  /**
   * Mirrors the handler formatting logic from search-cpv-codes.ts.
   */
  function formatResponse(
    data: { codes: CPVCode[] },
    query: string,
    lang: Language
  ): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
    if (!data.codes || data.codes.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No CPV codes found for ${formatInlineCode(query)}.`,
          },
        ],
      };
    }

    const flatCodes = flattenCodes(data.codes);

    let result = `# CPV Codes for ${formatInlineCode(query)}\n\n`;
    result += `${flatCodes.length} result(s) found.\n\n`;

    for (const item of flatCodes) {
      const label = getTranslationFn(item.label, lang);
      result += `- **${item.code}** - ${label}\n`;
    }

    result += `\n*Use these codes with the cpvCodes parameter of search_tenders.*`;

    return {
      content: [{ type: "text" as const, text: result }],
    };
  }

  it("should return exact empty results message when no codes found", () => {
    const response = formatResponse({ codes: [] }, "nonexistent", "en");
    expect(response.content).toHaveLength(1);
    expect(response.content[0].text).toBe(
      "No CPV codes found for `nonexistent`."
    );
  });

  it("should return empty results message for null-like codes array", () => {
    const response = formatResponse(
      { codes: [] },
      "something",
      "fr"
    );
    expect(response.content[0].text).toBe(
      "No CPV codes found for `something`."
    );
    expect(response.isError).toBeUndefined();
  });

  it("should fence backticks in query so they don't break the code span", () => {
    const response = formatResponse({ codes: [] }, "test`injection", "en");
    // Input contains one backtick → fence is two backticks (CommonMark §6.1).
    expect(response.content[0].text).toBe(
      "No CPV codes found for ``test`injection``."
    );
  });

  it("should include correct result count for successful search", () => {
    const data = {
      codes: [
        { code: "72000000", label: { en: "IT services", de: "IT-Dienste" } },
        { code: "72200000", label: { en: "Software", de: "Software" } },
      ],
    };
    const response = formatResponse(data, "IT", "en");
    expect(response.content[0].text).toContain("2 result(s) found.");
  });

  it("should format code list with correct structure", () => {
    const data = {
      codes: [
        { code: "72000000", label: { en: "IT services" } },
      ],
    };
    const response = formatResponse(data, "IT", "en");
    const text = response.content[0].text;

    expect(text).toContain("# CPV Codes for `IT`");
    expect(text).toContain("1 result(s) found.");
    expect(text).toContain("- **72000000** - IT services");
    expect(text).toContain(
      "*Use these codes with the cpvCodes parameter of search_tenders.*"
    );
  });

  it("should flatten nested codes and count all levels", () => {
    const data = {
      codes: [
        {
          code: "72000000",
          label: { en: "IT services" },
          codes: [
            { code: "72200000", label: { en: "Software" } },
            {
              code: "72300000",
              label: { en: "Data services" },
              codes: [
                { code: "72310000", label: { en: "Data processing" } },
              ],
            },
          ],
        },
      ],
    };
    const response = formatResponse(data, "IT", "en");
    const text = response.content[0].text;

    expect(text).toContain("4 result(s) found.");
    expect(text).toContain("- **72000000** - IT services");
    expect(text).toContain("- **72200000** - Software");
    expect(text).toContain("- **72300000** - Data services");
    expect(text).toContain("- **72310000** - Data processing");
  });

  it("should use getTranslation for multilingual labels", () => {
    const mockGetTranslation = vi.fn(
      (_t: Translation | null | undefined, _lang: Language) => "mocked label"
    );
    const originalFn = getTranslationFn;
    getTranslationFn = mockGetTranslation;

    try {
      const data = {
        codes: [
          {
            code: "72000000",
            label: { de: "IT-Dienste", fr: "Services IT", en: "IT services" },
          },
        ],
      };
      const response = formatResponse(data, "IT", "fr");
      const text = response.content[0].text;

      expect(mockGetTranslation).toHaveBeenCalledWith(
        { de: "IT-Dienste", fr: "Services IT", en: "IT services" },
        "fr"
      );
      expect(text).toContain("- **72000000** - mocked label");
    } finally {
      getTranslationFn = originalFn;
    }
  });

  it("should use translated labels for the requested language", () => {
    const data = {
      codes: [
        {
          code: "72000000",
          label: { de: "IT-Dienste", fr: "Services IT", en: "IT services", it: "Servizi IT" },
        },
      ],
    };

    const responseFr = formatResponse(data, "IT", "fr");
    expect(responseFr.content[0].text).toContain("- **72000000** - Services IT");

    const responseDe = formatResponse(data, "IT", "de");
    expect(responseDe.content[0].text).toContain("- **72000000** - IT-Dienste");

    const responseIt = formatResponse(data, "IT", "it");
    expect(responseIt.content[0].text).toContain("- **72000000** - Servizi IT");
  });

  it("should fall back through language chain when preferred language is missing", () => {
    const data = {
      codes: [
        {
          code: "72000000",
          label: { de: "IT-Dienste" },
        },
      ],
    };
    // Requesting "en" but only "de" available — should fall back to "de"
    const response = formatResponse(data, "IT", "en");
    expect(response.content[0].text).toContain("- **72000000** - IT-Dienste");
  });
});
