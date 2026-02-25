/**
 * Tests for formatting utilities.
 */

import { describe, it, expect } from "vitest";
import { buildSimapUrl } from "../../src/utils/formatting.js";

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
