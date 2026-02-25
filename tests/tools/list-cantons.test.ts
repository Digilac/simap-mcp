/**
 * Tests for list_cantons tool
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definition (mirrors the one in list-cantons.ts - empty schema)
const schema = z.object({});

describe("list_cantons schema validation", () => {
  it("should accept empty parameters", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should ignore extra parameters", () => {
    const result = schema.safeParse({ unknown: "value" });
    expect(result.success).toBe(true);
  });
});

describe("response formatting", () => {
  const CANTON_NAMES: Record<string, string> = {
    VD: "Vaud",
    GE: "Genève",
    BE: "Bern",
  };

  /**
   * Helper function that mirrors the response formatting logic
   */
  function formatCantons(cantons: Array<{ id: string; nuts3: string }>): string {
    let result = `# Cantons suisses\n\n`;
    result += `| Code | Nom |\n|------|-----|\n`;

    for (const canton of cantons) {
      const name = CANTON_NAMES[canton.id] ?? canton.id;
      result += `| ${canton.id} | ${name} |\n`;
    }

    result += `\n*Utilisez ces codes avec le paramètre cantons de search_tenders.*`;
    return result;
  }

  it("should format cantons as markdown table", () => {
    const cantons = [
      { id: "VD", nuts3: "CH011" },
      { id: "GE", nuts3: "CH013" },
    ];

    const result = formatCantons(cantons);

    expect(result).toContain("| Code | Nom |");
    expect(result).toContain("| VD | Vaud |");
    expect(result).toContain("| GE | Genève |");
  });

  it("should include usage hint", () => {
    const cantons = [{ id: "BE", nuts3: "CH021" }];
    const result = formatCantons(cantons);

    expect(result).toContain("cantons de search_tenders");
  });
});
