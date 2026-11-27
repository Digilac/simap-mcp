/**
 * Skill: simap-workflow
 * Packaged guidance on how to chain the simap tools: pick the filters, search,
 * open the results, check their history and analyze a tender.
 *
 * Published through the MCP Skills extension. The analysis part reuses the
 * sections and rules of the `analyze_tender` prompt, so the Skill and the
 * prompt cannot drift apart. The Skill only documents the existing tools; it
 * adds no behavior.
 */

import { Skill } from "@prefecthq/fastmcp-ts/server";
import {
  TENDER_ANALYSIS_RULES,
  TENDER_ANALYSIS_SECTIONS,
} from "../prompts/analyze-tender.js";

/** Skill name: the `skill://simap-workflow/` URI segment and the frontmatter `name`. */
export const SIMAP_WORKFLOW_SKILL_NAME = "simap-workflow";

/** Frontmatter `description`: tells the agent when to load the Skill. */
export const SIMAP_WORKFLOW_SKILL_DESCRIPTION =
  "Find, filter and analyze Swiss public tenders on simap.ch with the simap MCP tools. " +
  "Use when the user asks about Swiss public procurement, simap tenders or awards, " +
  "CPV or BKP codes, a canton's or a buyer's tenders, or whether to bid on a tender.";

/**
 * Builds the SKILL.md body (everything after the frontmatter). Exported for tests.
 */
export function buildSimapWorkflowInstructions(): string {
  return `# simap.ch tender workflow

The simap tools read Switzerland's public procurement platform, simap.ch. They are read-only and need no account. Chain them in the order below.

## 1. Choose the filters

- **Subject.** \`search_tenders\` filters on CPV codes (\`cpvCodes\`, 8 digits) and, for construction, BKP codes (\`bkpCodes\`). Find them with \`search_cpv_codes\` or \`browse_cpv_tree\`, and \`search_bkp_codes\` or \`browse_bkp_tree\`. When several codes fit, pass them all.
- **NPK and OAG codes.** \`search_npk_codes\`, \`browse_npk_tree\`, \`search_oag_codes\` and \`browse_oag_tree\` explain construction positions and object types. \`search_tenders\` has no filter for them: use them to read a tender, or to pick words for a \`search\` text.
- **Region.** \`cantons\` takes two-letter codes such as \`BE\`, \`VD\`, \`GE\` or \`ZH\`. Call \`list_cantons\` when unsure.
- **Buyer.** \`issuedByOrganizations\` takes an institution ID from \`list_institutions\` (every office of that institution) or a procurement office ID from \`search_proc_offices\` (that office only).
- **Kind of contract.** \`projectSubTypes\` (construction, service, supply, competitions, studies and requests for information), \`processTypes\` (open, selective, invitation, direct, no_process) and \`pubTypes\` (tender, award_tender, correction, revocation and others).

## 2. Search

Call \`search_tenders\` with these filters.

- **Dates.** \`publicationFrom\` and \`publicationUntil\` (\`YYYY-MM-DD\`) filter on the date of the latest publication. With no filter at all, the tool only returns what was published today (Europe/Zurich). Any other filter turns that default off, so a search on a canton or a code alone covers every date. Set \`publicationFrom\` when the user wants recent publications. A recent publication can be an award, and an older call for tenders can still be open: for open calls, add \`pubTypes: ["tender", "correction"]\` (the filter applies to the latest publication, and a corrected call's latest publication is the correction), then check the deadline and status in the details and the history.
- **Text.** \`search\` needs at least 3 characters.
- **Language.** \`lang\` (\`de\`, \`fr\`, \`it\`, \`en\`; default \`en\`) picks the language of titles. Use the user's language.
- **Pages.** When the output ends with "More results available", call again with the same filters and the \`lastItem\` it gives. If the first call had no filter, pass the date it covered (today in Europe/Zurich, \`YYYY-MM-DD\`) as \`publicationFrom\` on every next page, and keep that same date even if midnight passes while paging: \`lastItem\` counts as a filter and would turn the today-only default off.

## 3. Open the results

Call \`get_tender_details\` with the "Project ID" of each result worth a closer look. Leave \`publicationId\` out to get the latest publication. For a project with lots, that is the most recently published lot: to read another lot, call again with the "Publication ID" listed under it. Set \`fullRaw\` only when the structured fields are not enough.

## 4. Check the history

Call \`get_publication_history\` with the "Publication ID" from the details (under "Latest Publication", or under each lot; once per distinct ID). It shows corrections, cancellations and awards that change the tender.

## 5. Analyze a tender

When the user asks what a tender involves or whether to bid, write this analysis from the tool output. The \`analyze_tender\` prompt asks for the same analysis from a single simap.ch link.

${TENDER_ANALYSIS_SECTIONS}

## Rules

${TENDER_ANALYSIS_RULES}
`;
}

/**
 * Builds the immutable Skill snapshot. Exported for tests.
 */
export function createSimapWorkflowSkill(): Promise<Skill> {
  return Skill.create({
    name: SIMAP_WORKFLOW_SKILL_NAME,
    description: SIMAP_WORKFLOW_SKILL_DESCRIPTION,
    instructions: buildSimapWorkflowInstructions(),
  });
}
