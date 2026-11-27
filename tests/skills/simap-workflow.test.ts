/**
 * Tests for the simap-workflow Skill.
 */

import { describe, it, expect } from "vitest";
import {
  SIMAP_WORKFLOW_SKILL_DESCRIPTION,
  SIMAP_WORKFLOW_SKILL_NAME,
  buildSimapWorkflowInstructions,
  createSimapWorkflowSkill,
} from "../../src/skills/simap-workflow.js";
import {
  TENDER_ANALYSIS_RULES,
  TENDER_ANALYSIS_SECTIONS,
  buildAnalyzeTenderPrompt,
} from "../../src/prompts/analyze-tender.js";

describe("simap-workflow skill", () => {
  describe("frontmatter", () => {
    it("uses a valid Agent Skills name", () => {
      // Lowercase letters, digits and single hyphens, at most 64 characters.
      expect(SIMAP_WORKFLOW_SKILL_NAME).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(SIMAP_WORKFLOW_SKILL_NAME.length).toBeLessThanOrEqual(64);
    });

    it("keeps the description within the 1024-character limit", () => {
      expect(SIMAP_WORKFLOW_SKILL_DESCRIPTION.length).toBeGreaterThan(0);
      expect(SIMAP_WORKFLOW_SKILL_DESCRIPTION.length).toBeLessThanOrEqual(1024);
    });
  });

  describe("instructions", () => {
    const body = buildSimapWorkflowInstructions();

    it("reuses the analysis sections and rules of analyze_tender verbatim", () => {
      expect(body).toContain(TENDER_ANALYSIS_SECTIONS);
      expect(body).toContain(`## Rules\n\n${TENDER_ANALYSIS_RULES}`);
    });

    it("asks for the same analysis as the analyze_tender prompt", () => {
      const prompt = buildAnalyzeTenderPrompt({
        url: "https://www.simap.ch/fr/project-detail/11111111-1111-4111-8111-111111111111",
      });
      const promptAnalysis = prompt.slice(prompt.indexOf("### 1. Overview"));
      expect(body).toContain(promptAnalysis);
    });

    it("documents the search_tenders date default", () => {
      expect(body).toContain("only returns what was published today (Europe/Zurich)");
      expect(body).toContain("`publicationFrom`");
    });

    it("follows the workflow order: filters, search, details, history, analysis", () => {
      const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      expect(headings).toEqual([
        "1. Choose the filters",
        "2. Search",
        "3. Open the results",
        "4. Check the history",
        "5. Analyze a tender",
        "Rules",
      ]);
    });
  });

  describe("snapshot", () => {
    it("builds a SKILL.md with the name, description and instructions", async () => {
      const skill = await createSimapWorkflowSkill();
      expect(skill.name).toBe(SIMAP_WORKFLOW_SKILL_NAME);
      expect(skill.description).toBe(SIMAP_WORKFLOW_SKILL_DESCRIPTION);
      expect(Object.keys(skill.files)).toEqual(["SKILL.md"]);

      const text = new TextDecoder().decode(skill.files["SKILL.md"]);
      expect(text.startsWith("---\n")).toBe(true);
      expect(text).toContain(`name: ${SIMAP_WORKFLOW_SKILL_NAME}\n`);
      expect(text.endsWith(buildSimapWorkflowInstructions())).toBe(true);
    });
  });
});
