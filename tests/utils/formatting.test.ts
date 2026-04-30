/**
 * Tests for formatting utilities.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  buildSimapUrl,
  escapeInlineCode,
  formatInlineCode,
  formatPublicationDetails,
} from "../../src/utils/formatting.js";
import { PublicationDetailsSchema } from "../../src/types/schemas.js";
import type { PublicationDetails } from "../../src/types/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

/**
 * Loads a JSON fixture from tests/fixtures and validates it through the
 * real `PublicationDetailsSchema`. Parsing via the schema guarantees the
 * fixture keeps matching the schema as the latter evolves.
 */
function loadFixture(name: string): PublicationDetails {
  const raw = JSON.parse(
    readFileSync(resolve(FIXTURES_DIR, name), "utf-8")
  ) as unknown;
  return PublicationDetailsSchema.parse(raw) as PublicationDetails;
}

describe("buildSimapUrl", () => {
  const projectId = "3ce500a8-cfda-4417-b2a1-82087862e3f7";

  it("should build correct URL for French", () => {
    const url = buildSimapUrl(projectId, "fr");
    expect(url).toBe(`https://www.simap.ch/fr/project-detail/${projectId}`);
  });

  it("should build correct URL for German", () => {
    const url = buildSimapUrl(projectId, "de");
    expect(url).toBe(`https://www.simap.ch/de/project-detail/${projectId}`);
  });

  it("should build correct URL for Italian", () => {
    const url = buildSimapUrl(projectId, "it");
    expect(url).toBe(`https://www.simap.ch/it/project-detail/${projectId}`);
  });

  it("should build correct URL for English", () => {
    const url = buildSimapUrl(projectId, "en");
    expect(url).toBe(`https://www.simap.ch/en/project-detail/${projectId}`);
  });
});

describe("escapeInlineCode", () => {
  it("should escape a lone backtick", () => {
    expect(escapeInlineCode("foo`bar")).toBe("foo\\`bar");
  });

  it("should escape a lone backslash", () => {
    expect(escapeInlineCode("foo\\bar")).toBe("foo\\\\bar");
  });

  it("should escape backslashes before backticks so the backtick stays escaped", () => {
    // Input: `\` (a backslash followed by a backtick).
    // Without backslash escaping the result would be `\\\`` — Markdown reads
    // the doubled backslash as a literal `\` and the backtick re-emerges
    // un-escaped. Escaping the backslash first yields `\\\\\\``.
    expect(escapeInlineCode("\\`")).toBe("\\\\\\`");
  });

  it("should collapse newlines into a single space", () => {
    expect(escapeInlineCode("a\nb\r\nc\rd")).toBe("a b c d");
  });

  it("should leave benign input untouched", () => {
    expect(escapeInlineCode("hello world")).toBe("hello world");
  });

  it("should return empty string for empty input", () => {
    expect(escapeInlineCode("")).toBe("");
  });
});

describe("formatInlineCode", () => {
  it("should wrap benign input in single backticks", () => {
    expect(formatInlineCode("foo")).toBe("`foo`");
  });

  it("should pick a 2-backtick fence when input contains a single backtick", () => {
    // CommonMark §6.1: the fence run length must differ from any backtick run
    // in the content. A 2-backtick fence safely contains a single backtick.
    expect(formatInlineCode("a`b")).toBe("``a`b``");
  });

  it("should pick a 3-backtick fence when input contains a 2-backtick run", () => {
    expect(formatInlineCode("a``b")).toBe("```a``b```");
  });

  it("should pad with spaces when content starts or ends with a backtick", () => {
    // The pad lets the parser disambiguate the fence from the content; the
    // pad itself is stripped at render time when the content has any
    // non-space char.
    expect(formatInlineCode("`x`")).toBe("`` `x` ``");
  });

  it("should handle a single-backtick input by fencing with two and padding", () => {
    expect(formatInlineCode("`")).toBe("`` ` ``");
  });

  it("should collapse newlines into a single space", () => {
    expect(formatInlineCode("a\nb\r\nc")).toBe("`a b c`");
  });

  it("should produce a non-empty span for empty input", () => {
    // Empty inline code spans are awkward in CommonMark; we emit `` ` ` ``
    // (one space) which renders to an empty inline code span.
    expect(formatInlineCode("")).toBe("` `");
  });

  it("should not pad when only the middle of the content has backticks", () => {
    expect(formatInlineCode("foo`bar`baz")).toBe("``foo`bar`baz``");
  });
});

describe("formatPublicationDetails — tender fixture", () => {
  const details = loadFixture("publication-details-tender.json");
  const output = formatPublicationDetails(details, "fr");

  it("should render publication info with real title and numbers", () => {
    expect(output).toContain("## Publication Details");
    expect(output).toContain("MP 2025.04.775 - Licences et support Atlassian");
    expect(output).toContain("29941-01");
    expect(output).toContain("29941");
    expect(output).toContain("tender");
    expect(output).toContain("open");
    expect(output).toContain("service");
  });

  it("should render the primary CPV code with its label", () => {
    expect(output).toContain("### CPV");
    expect(output).toContain("48000000");
    expect(output).toContain("Logiciels");
  });

  it("should render submission deadline and offer opening from dates.*", () => {
    expect(output).toContain("### Deadlines");
    expect(output).toContain("2026-03-05T12:00:00+01:00");
    expect(output).toContain("2026-03-05T14:00:00+01:00");
    expect(output).toContain("364 days");
  });

  it("should render Q&A rounds from dates.qnas", () => {
    expect(output).toContain("Q&A Rounds");
    expect(output).toContain("2026-02-09");
  });

  it("should render conditions from terms.*", () => {
    expect(output).toContain("### Conditions");
    expect(output).toContain("Consortium allowed:");
    expect(output).toContain("Subcontracting allowed:");
    expect(output).toContain("Terms type:** in_documents");
    expect(output).toContain("Remedies notice:");
  });

  it("should render criteria from criteria.*", () => {
    expect(output).toContain("### Criteria");
    expect(output).toContain("Qualification criteria in documents:");
    expect(output).toContain("Award criteria selection:");
  });

  it("should render publishers from publishers[]", () => {
    expect(output).toContain("### Publishers");
    expect(output).toContain("simap.ch");
  });

  it("should not render Award Decision for tender type", () => {
    expect(output).not.toContain("### Award Decision");
  });

  it("should not include the legacy truncation marker", () => {
    expect(output).not.toContain("(truncated)");
  });

  it("should use the requested language for translations", () => {
    const de = formatPublicationDetails(details, "de");
    expect(de).toContain("Softwarepaket und Informationssysteme");
  });
});

describe("formatPublicationDetails — award fixture", () => {
  const details = loadFixture("publication-details-award.json");
  const output = formatPublicationDetails(details, "fr");

  it("should render the Award Decision section with vendor and price", () => {
    expect(output).toContain("### Award Decision");
    expect(output).toContain("2026-04-15");
    expect(output).toContain("SOGECA SA");
    expect(output).toContain("2724864.44");
    expect(output).toContain("CHF");
    expect(output).toContain("Number of Submissions:** 4");
  });

  it("should render publication info even without tender-specific sections", () => {
    expect(output).toContain("BHNS GVZ");
    expect(output).toContain("19474-03");
  });

  it("should gracefully omit sections missing from award publications", () => {
    expect(output).not.toContain("### Deadlines");
    expect(output).not.toContain("### Conditions");
    expect(output).not.toContain("### Criteria");
  });
});

describe("formatPublicationDetails — empty input", () => {
  it("should still produce the Publication Details header when given an empty object", () => {
    const output = formatPublicationDetails({}, "en");
    expect(output).toContain("## Publication Details");
  });
});

describe("formatPublicationDetails — edge cases", () => {
  it("should fall back to procurement.cpvCode when base.cpvCode lacks a code", () => {
    const details: PublicationDetails = {
      base: { cpvCode: { label: { en: "Partial label" } } },
      procurement: { cpvCode: { code: "45200000", label: { en: "Real label" } } },
    };
    const output = formatPublicationDetails(details, "en");
    expect(output).toContain("### CPV");
    expect(output).toContain("45200000");
    expect(output).toContain("Real label");
  });

  it("should render qnas.externalLink when date and note are absent", () => {
    const details: PublicationDetails = {
      dates: {
        qnas: [{ externalLink: "https://example.com/qa" }],
      },
    };
    const output = formatPublicationDetails(details, "en");
    expect(output).toContain("Q&A Rounds");
    expect(output).toContain("https://example.com/qa");
    expect(output).not.toContain("(no date)");
  });
});
