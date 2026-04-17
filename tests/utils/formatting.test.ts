/**
 * Tests for formatting utilities.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  buildSimapUrl,
  formatPublicationDetails,
} from "../../src/utils/formatting.js";
import { PublicationDetailsSchema } from "../../src/types/schemas.js";
import type { PublicationDetails } from "../../src/types/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

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

describe("formatPublicationDetails — tender fixture", () => {
  const details = loadFixture("publication-details-tender.json");
  const output = formatPublicationDetails(details, "fr");

  it("renders publication info with real title and numbers", () => {
    expect(output).toContain("## Publication Details");
    expect(output).toContain("MP 2025.04.775 - Licences et support Atlassian");
    expect(output).toContain("29941-01");
    expect(output).toContain("29941");
    expect(output).toContain("tender");
    expect(output).toContain("open");
    expect(output).toContain("service");
  });

  it("renders the primary CPV code with its label", () => {
    expect(output).toContain("### CPV");
    expect(output).toContain("48000000");
    expect(output).toContain("Logiciels");
  });

  it("renders submission deadline and offer opening from dates.*", () => {
    expect(output).toContain("### Deadlines");
    expect(output).toContain("2026-03-05T12:00:00+01:00");
    expect(output).toContain("2026-03-05T14:00:00+01:00");
    expect(output).toContain("364 days");
  });

  it("renders Q&A rounds from dates.qnas", () => {
    expect(output).toContain("Q&A Rounds");
    expect(output).toContain("2026-02-09");
  });

  it("renders conditions from terms.*", () => {
    expect(output).toContain("### Conditions");
    expect(output).toContain("Consortium allowed:");
    expect(output).toContain("Subcontracting allowed:");
    expect(output).toContain("Remedies notice:");
  });

  it("renders criteria from criteria.*", () => {
    expect(output).toContain("### Criteria");
    expect(output).toContain("Qualification criteria in documents:");
    expect(output).toContain("Award criteria selection:");
  });

  it("renders publishers from publishers[]", () => {
    expect(output).toContain("### Publishers");
    expect(output).toContain("simap.ch");
  });

  it("does not render Award Decision for tender type", () => {
    expect(output).not.toContain("### Award Decision");
  });

  it("does not include the legacy truncation marker", () => {
    expect(output).not.toContain("(truncated)");
  });

  it("uses the requested language for translations", () => {
    const de = formatPublicationDetails(details, "de");
    expect(de).toContain("Softwarepaket und Informationssysteme");
  });
});

describe("formatPublicationDetails — award fixture", () => {
  const details = loadFixture("publication-details-award.json");
  const output = formatPublicationDetails(details, "fr");

  it("renders the Award Decision section with vendor and price", () => {
    expect(output).toContain("### Award Decision");
    expect(output).toContain("2026-04-15");
    expect(output).toContain("SOGECA SA");
    expect(output).toContain("2724864.44");
    expect(output).toContain("CHF");
    expect(output).toContain("Number of Submissions:** 4");
  });

  it("renders publication info even without tender-specific sections", () => {
    expect(output).toContain("BHNS GVZ");
    expect(output).toContain("19474-03");
  });

  it("gracefully omits sections missing from award publications", () => {
    expect(output).not.toContain("### Deadlines");
    expect(output).not.toContain("### Conditions");
    expect(output).not.toContain("### Criteria");
  });
});

describe("formatPublicationDetails — empty input", () => {
  it("still produces the Publication Details header when given an empty object", () => {
    const output = formatPublicationDetails({}, "en");
    expect(output).toContain("## Publication Details");
  });
});
