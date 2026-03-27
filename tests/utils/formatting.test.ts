/**
 * Tests for formatting utilities.
 */

import { describe, it, expect } from "vitest";
import { buildSimapUrl, formatJsonPreview } from "../../src/utils/formatting.js";

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

describe("formatJsonPreview", () => {
  it("should return full JSON when under max length", () => {
    const data = { key: "value" };
    const result = formatJsonPreview(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
    expect(result).not.toContain("truncated");
  });

  it("should truncate long JSON at newline boundary", () => {
    const data = { a: "x".repeat(100), b: "y".repeat(100), c: "z".repeat(100) };
    const result = formatJsonPreview(data, 50);
    expect(result).toContain("... (truncated)");
    // The content before truncation should be shorter than a naive substring
    const naiveTruncation = JSON.stringify(data, null, 2).substring(0, 50);
    const beforeMarker = result.split("\n... (truncated)")[0];
    expect(beforeMarker.length).toBeLessThanOrEqual(naiveTruncation.length);
  });

  it("should handle very small maxLength", () => {
    const data = { key: "value" };
    const result = formatJsonPreview(data, 5);
    expect(result).toContain("... (truncated)");
  });
});
