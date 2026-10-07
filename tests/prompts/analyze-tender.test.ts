/**
 * Tests for analyze_tender prompt.
 */

import { describe, it, expect } from "vitest";
import {
  analyzeTenderArgsSchema as schema,
  buildAnalyzeTenderPrompt,
  handler,
  parseTenderReference,
} from "../../src/prompts/analyze-tender.js";

const PROJECT_ID = "bc4a52ee-2a33-40fb-912f-d4863b9285bf";
const URL_FR = `https://www.simap.ch/fr/project-detail/${PROJECT_ID}`;

describe("analyze_tender", () => {
  describe("schema validation", () => {
    it("accepts a simap.ch link", () => {
      expect(schema.safeParse({ url: URL_FR }).success).toBe(true);
    });

    it("rejects a missing or blank url", () => {
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ url: "   " }).success).toBe(false);
    });
  });

  describe("parseTenderReference", () => {
    it("extracts the project ID and language from a project-detail link", () => {
      expect(parseTenderReference(URL_FR)).toEqual({ projectId: PROJECT_ID, lang: "fr" });
    });

    it("ignores query strings and fragments", () => {
      expect(
        parseTenderReference(`https://simap.ch/de/project-detail/${PROJECT_ID}?tab=docs#lot-1`)
      ).toEqual({ projectId: PROJECT_ID, lang: "de" });
    });

    it("normalises an upper-case UUID", () => {
      expect(parseTenderReference(URL_FR.toUpperCase()).projectId).toBe(PROJECT_ID);
    });

    it("falls back to a bare UUID and the en language", () => {
      expect(parseTenderReference(PROJECT_ID)).toEqual({ projectId: PROJECT_ID, lang: "en" });
    });

    it("returns no project ID for free text", () => {
      expect(parseTenderReference("Aussengestaltung Gletsch")).toEqual({
        projectId: undefined,
        lang: "en",
      });
    });
  });

  describe("prompt text", () => {
    it("tells the model to load the tender from the project ID in the link", () => {
      const text = buildAnalyzeTenderPrompt({ url: URL_FR });
      expect(text).toContain(
        `\`get_tender_details\` with \`projectId: "${PROJECT_ID}"\` and \`lang: "fr"\``
      );
      expect(text).not.toContain("search_tenders");
    });

    it("tells the model to search for the tender when the input is not a link", () => {
      const text = buildAnalyzeTenderPrompt({ url: "15744" });
      expect(text).toContain("call `search_tenders`");
      expect(text).toContain("Input: 15744");
    });

    it("instructs the model to check the publication history", () => {
      expect(buildAnalyzeTenderPrompt({ url: URL_FR })).toContain("`get_publication_history`");
    });

    it("lists every analysis section", () => {
      const text = buildAnalyzeTenderPrompt({ url: URL_FR });
      for (const heading of [
        "### 1. Overview",
        "### 2. Scope",
        "### 3. Key dates",
        "### 4. Eligibility and qualification",
        "### 5. Award criteria",
        "### 6. Submission requirements",
        "### 7. Risks and open questions",
        "### 8. Bid / no-bid summary",
      ]) {
        expect(text).toContain(heading);
      }
    });

    it("forbids inventing missing information", () => {
      expect(buildAnalyzeTenderPrompt({ url: URL_FR })).toContain(
        "Not specified in the publication"
      );
    });
  });

  describe("handler", () => {
    it("returns the prompt text for a valid link", () => {
      expect(handler({ url: URL_FR })).toContain(PROJECT_ID);
    });

    it("throws an error naming the invalid argument", () => {
      expect(() => handler({})).toThrow(/Invalid arguments for prompt analyze_tender:\n- url: /);
    });
  });
});
