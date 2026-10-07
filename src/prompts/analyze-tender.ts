/**
 * Prompt: analyze_tender
 * Guides the model through a structured bid/no-bid analysis of one tender.
 *
 * The user only pastes the simap.ch link they have in their browser. The
 * prompt only produces instructions: the model fetches the data itself
 * through `get_tender_details` and `get_publication_history`, so the analysis
 * logic stays in the tools.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import type { Language } from "../types/index.js";

/**
 * Schema for analyze_tender arguments. MCP prompt arguments are always strings.
 * Exported so tests can import the source of truth.
 */
export const analyzeTenderArgsSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .describe("Link to the tender on simap.ch (or its project number or title)"),
});
export type AnalyzeTenderArgs = z.infer<typeof analyzeTenderArgsSchema>;

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export interface TenderReference {
  /** Project ID found in the link, if any. */
  projectId?: string;
  /** Language segment of the link (`/fr/project-detail/...`), defaulting to `en`. */
  lang: Language;
}

/**
 * Extracts the project ID and language from a simap.ch link such as
 * `https://www.simap.ch/fr/project-detail/<projectId>`. Falls back to the first
 * UUID anywhere in the text. Exported for tests.
 */
export function parseTenderReference(input: string): TenderReference {
  const projectId =
    new RegExp(`project-detail/(${UUID_PATTERN})`, "i").exec(input)?.[1] ??
    new RegExp(UUID_PATTERN, "i").exec(input)?.[0];
  const lang = /simap\.ch\/(de|fr|it|en)\//i.exec(input)?.[1]?.toLowerCase() as
    Language | undefined;

  return { projectId: projectId?.toLowerCase(), lang: lang ?? "en" };
}

/**
 * Builds the prompt text for analyze_tender. Exported for tests.
 */
export function buildAnalyzeTenderPrompt(args: AnalyzeTenderArgs): string {
  const { projectId, lang } = parseTenderReference(args.url);

  const findTender = projectId
    ? `1. Call \`get_tender_details\` with \`projectId: "${projectId}"\` and \`lang: "${lang}"\`. Leave \`publicationId\` out: the tool then loads the latest publication.`
    : `1. The input below is not a simap.ch tender link. Treat it as a project number or title: call \`search_tenders\` with it as \`search\` text (no date filter) to find the project. If several projects match, list them and ask me which one to analyze before going further. Then call \`get_tender_details\` with the project ID you found and \`lang: "${lang}"\`.

   Input: ${args.url}`;

  return `Analyze the following public tender from simap.ch and help me decide whether to bid.

## Steps

${findTender}
2. Call \`get_publication_history\` with the "Publication ID" shown in the output (under "Latest Publication", or under each lot for projects with lots; call it once per distinct ID) to check for corrections, cancellations or an award that change this tender.
3. Write the analysis below using only the data returned by these tools.

## Analysis

### 1. Overview
Title, contracting authority, procurement type (construction / service / supply), procedure type, CPV codes, place of performance, and whether the contract falls under international agreements (WTO/GPA).

### 2. Scope
What is being procured, in 3 to 5 sentences. List the lots, if any, with a one-line summary each and whether bids per lot are allowed.

### 3. Key dates
Table of all deadlines (questions, site visit, submission, opening, contract start/end) with the number of days remaining from today. Flag any deadline that has already passed or is less than 10 days away.

### 4. Eligibility and qualification
Suitability criteria, required certificates and references, and whether consortia or subcontracting are allowed.

### 5. Award criteria
Table of the award criteria with their weighting. Note how price is weighted relative to quality.

### 6. Submission requirements
Accepted languages, submission format and channel, required documents, offer validity period, and where the tender documents can be obtained.

### 7. Risks and open questions
Unusual or restrictive conditions, ambiguities worth raising during the Q&A period, and any amendment found in the publication history.

### 8. Bid / no-bid summary
Three to five bullet points summarising the opportunity, the main effort drivers and the main risks.

## Rules

- Never invent information. When a field is missing from the tool output, write "Not specified in the publication".
- Quote amounts, dates and criteria exactly as published.
- If the latest publication is a cancellation or an award, say so at the top of the analysis.
- If a tool returns an error, report it and stop instead of guessing.`;
}

/**
 * Formats Zod issues into a single message naming each invalid argument.
 * Prompts have no `isError` result, so the message surfaces as a protocol error.
 */
function formatArgsError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  return `Invalid arguments for prompt analyze_tender:\n${lines.join("\n")}`;
}

/**
 * Handler for analyze_tender. Exported for tests.
 */
export function handler(rawArgs: Record<string, string> = {}): string {
  const parsed = analyzeTenderArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error(formatArgsError(parsed.error));
  }
  return buildAnalyzeTenderPrompt(parsed.data);
}

export function registerAnalyzeTender(server: FastMCP): void {
  server.prompt(
    {
      name: "analyze_tender",
      title: "Analyze tender",
      description:
        "Structured bid/no-bid analysis of a simap tender: scope, deadlines, eligibility, award criteria, submission requirements and risks",
      arguments: [
        {
          name: "url",
          description:
            "Link to the tender on simap.ch, e.g. https://www.simap.ch/fr/project-detail/… (a project number or title also works)",
          required: true,
        },
      ],
    },
    handler
  );
}
