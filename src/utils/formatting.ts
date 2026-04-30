/**
 * Markdown formatting utilities.
 */

import type { Language } from "../types/index.js";
import type {
  ProjectSearchEntry,
  ProjectHeader,
  PublicationDetails,
} from "../types/api.js";
import { getTranslation } from "./translation.js";

const SIMAP_BASE_URL = "https://www.simap.ch";

/**
 * Defensively escapes user input for embedding into inline Markdown *prose*
 * (i.e. plain text in list items, paragraphs — NOT inside a code span).
 *
 * Backslashes must be escaped before backticks: otherwise input like `` \` ``
 * would become `` \\` ``, which Markdown reads as a literal `\` followed by an
 * un-escaped backtick. Newlines are collapsed to spaces.
 *
 * For embedding inside a code span, use {@link formatInlineCode} instead —
 * CommonMark treats backslashes as literal inside code spans, so backslash
 * escaping does nothing there.
 */
export function escapeInlineCode(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/[\r\n]+/g, " ");
}

/**
 * Wraps user input in a CommonMark-safe inline code span.
 *
 * Per CommonMark §6.1, a code span is delimited by backtick runs of equal
 * length, and a backtick run inside the content cannot match the fence. We
 * pick a fence one longer than the longest run of backticks in `value`, and
 * pad with a single space if the content starts or ends with a backtick (the
 * pad is stripped by the parser when the content has any non-space char, so
 * the rendering is unaffected).
 *
 * Newlines are collapsed to spaces; the renderer would do this anyway, but
 * doing it here keeps tool output predictable when concatenated into
 * multi-line blocks.
 *
 * Examples:
 *   formatInlineCode("foo")        → "`foo`"
 *   formatInlineCode("a`b")        → "``a`b``"
 *   formatInlineCode("`x`")        → "`` `x` ``"
 *   formatInlineCode("a``b")       → "```a``b```"
 */
export function formatInlineCode(value: string): string {
  const cleaned = value.replace(/[\r\n]+/g, " ");
  if (cleaned === "") return "` `";

  const runs = cleaned.match(/`+/g) ?? [];
  const longestRun = runs.reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(longestRun + 1);
  const pad = cleaned.startsWith("`") || cleaned.endsWith("`") ? " " : "";
  return `${fence}${pad}${cleaned}${pad}${fence}`;
}

/**
 * Builds the simap.ch URL for a project.
 */
export function buildSimapUrl(projectId: string, lang: Language): string {
  return `${SIMAP_BASE_URL}/${lang}/project-detail/${projectId}`;
}

/**
 * Formats a project search entry for display.
 */
export function formatProject(project: ProjectSearchEntry, lang: Language): string {
  const title = getTranslation(project.title, lang);
  const procOffice = getTranslation(project.procOfficeName, lang);
  const simapUrl = buildSimapUrl(project.id, lang);

  let result = `## ${title}\n\n`;
  result += `- **simap Link:** ${simapUrl}\n`;
  result += `- **Project Number:** ${project.projectNumber}\n`;
  result += `- **Publication Number:** ${project.publicationNumber}\n`;
  result += `- **Publication Date:** ${project.publicationDate}\n`;
  result += `- **Type:** ${project.projectSubType}\n`;
  result += `- **Process:** ${project.processType}\n`;
  result += `- **Office:** ${procOffice}\n`;
  result += `- **Project ID:** ${project.id}\n`;
  result += `- **Publication ID:** ${project.publicationId}\n`;

  if (project.orderAddress) {
    const addr = project.orderAddress;
    const city =
      typeof addr.city === "object" && addr.city !== null
        ? getTranslation(addr.city, lang)
        : addr.city;
    const canton = addr.cantonId || addr.canton;
    if (city || canton) {
      result += `- **Location:** ${[city, canton].filter(Boolean).join(", ")}\n`;
    }
  }

  if (project.lots && project.lots.length > 0) {
    result += `\n### Lots (${project.lots.length})\n`;
    for (const lot of project.lots) {
      result += `- Lot ${lot.lotNumber}: ${getTranslation(lot.lotTitle, lang)}\n`;
    }
  }

  return result;
}

/**
 * Formats project header information.
 */
export function formatProjectHeader(
  header: ProjectHeader,
  lang: Language,
  projectId?: string
): string {
  let result = `## General Information\n\n`;
  if (projectId) {
    result += `- **simap Link:** ${buildSimapUrl(projectId, lang)}\n`;
  }
  result += `- **Project Number:** ${header.projectNumber || "N/A"}\n`;
  result += `- **Title:** ${getTranslation(header.title, lang)}\n`;
  result += `- **Type:** ${header.projectSubType || "N/A"}\n`;
  result += `- **Process:** ${header.processType || "N/A"}\n`;

  if (header.latestPublication) {
    const pub = header.latestPublication;
    result += `\n### Latest Publication\n`;
    result += `- **Date:** ${pub.publicationDate || "N/A"}\n`;
    result += `- **Number:** ${pub.publicationNumber || "N/A"}\n`;
    result += `- **Type:** ${pub.pubType || "N/A"}\n`;
  }

  if (header.lots && header.lots.length > 0) {
    result += `\n### Lots (${header.lots.length})\n`;
    for (const lot of header.lots) {
      result += `\n#### Lot ${lot.lotNumber}: ${getTranslation(lot.lotTitle, lang)}\n`;
      if (lot.latestPublication) {
        result += `- Publication: ${lot.latestPublication.publicationNumber} (${lot.latestPublication.publicationDate})\n`;
      }
    }
  }

  return result;
}

/**
 * Formats publication details.
 *
 * Sections are rendered only when the underlying data is present. The response
 * shape varies by publication `type` (tender / award / ...) — no one section
 * is guaranteed.
 */
export function formatPublicationDetails(
  details: PublicationDetails,
  lang: Language
): string {
  const parts: string[] = [];

  parts.push(formatPublicationInfoSection(details, lang));

  const cpv = formatCpvSection(details, lang);
  if (cpv) parts.push(cpv);

  const deadlines = formatDeadlinesSection(details, lang);
  if (deadlines) parts.push(deadlines);

  const terms = formatTermsSection(details, lang);
  if (terms) parts.push(terms);

  const criteria = formatCriteriaSection(details, lang);
  if (criteria) parts.push(criteria);

  const award = formatAwardDecisionSection(details, lang);
  if (award) parts.push(award);

  const publishers = formatPublishersSection(details);
  if (publishers) parts.push(publishers);

  return parts.join("\n") + "\n";
}

/**
 * Renders the top-level "Publication Details" header + summary lines (title,
 * numbers, type, dates). Always returns a string — the header is emitted even
 * when every field is absent, so callers can rely on a stable anchor.
 */
function formatPublicationInfoSection(
  details: PublicationDetails,
  lang: Language
): string {
  const base = details.base ?? undefined;
  const info = details["project-info"] ?? undefined;

  const title =
    (base?.title && getTranslation(base.title, lang)) ||
    (info?.title && getTranslation(info.title, lang)) ||
    "";

  const processType =
    base?.processType || info?.processType || details.procurement?.processType;
  const orderType = base?.orderType || info?.orderType || details.procurement?.orderType;

  const typeLine = [details.type, processType, orderType].filter(Boolean).join(" · ");

  let out = `## Publication Details\n\n`;
  if (title) out += `- **Title:** ${title}\n`;
  if (base?.publicationNumber) {
    out += `- **Publication Number:** ${base.publicationNumber}\n`;
  }
  if (base?.projectNumber) {
    out += `- **Project Number:** ${base.projectNumber}\n`;
  }
  if (base?.publicationDate) {
    out += `- **Publication Date:** ${base.publicationDate}\n`;
  }
  if (typeLine) out += `- **Type:** ${typeLine}\n`;
  if (details.hasProjectDocuments !== undefined && details.hasProjectDocuments !== null) {
    out += `- **Has Project Documents:** ${details.hasProjectDocuments ? "yes" : "no"}\n`;
  }
  return out;
}

/**
 * Renders the CPV (Common Procurement Vocabulary) code section.
 * Returns null when no CPV code is present on either `base` or `procurement`.
 */
function formatCpvSection(details: PublicationDetails, lang: Language): string | null {
  // `base.cpvCode` may be a partial object (e.g. label only) — prefer it only
  // when it carries an actual `.code`, otherwise fall back to `procurement`.
  const cpv = details.base?.cpvCode?.code
    ? details.base.cpvCode
    : details.procurement?.cpvCode;
  if (!cpv || !cpv.code) return null;
  const label = cpv.label ? getTranslation(cpv.label, lang) : "";
  let out = `### CPV\n`;
  out += label ? `- **${cpv.code}** — ${label}\n` : `- **${cpv.code}**\n`;
  return out;
}

/**
 * Renders submission / opening / validity deadlines and Q&A rounds.
 * Returns null when `details.dates` is missing or contains no displayable field,
 * so the section header is not emitted for empty payloads (common on awards).
 */
function formatDeadlinesSection(
  details: PublicationDetails,
  lang: Language
): string | null {
  const dates = details.dates;
  if (!dates) return null;

  const qnas = dates.qnas ?? [];
  const hasAny =
    dates.offerDeadline ||
    dates.offerOpening?.dateTime ||
    dates.offerValidityDeadlineDays != null ||
    dates.offerValidityDeadlineDate ||
    qnas.length > 0;
  if (!hasAny) return null;

  let out = `### Deadlines\n`;
  if (dates.offerDeadline) {
    out += `- **Submission Deadline:** ${dates.offerDeadline}\n`;
  }
  if (dates.offerOpening?.dateTime) {
    out += `- **Offer Opening:** ${dates.offerOpening.dateTime}\n`;
  }
  if (dates.offerValidityDeadlineDate) {
    out += `- **Offer Validity Until:** ${dates.offerValidityDeadlineDate}\n`;
  } else if (dates.offerValidityDeadlineDays != null) {
    out += `- **Offer Validity:** ${dates.offerValidityDeadlineDays} days\n`;
  }
  if (qnas.length > 0) {
    out += `\n**Q&A Rounds:**\n`;
    for (const q of qnas) {
      const note = q.note ? getTranslation(q.note, lang) : "";
      const parts = [q.date, note, q.externalLink].filter(Boolean).join(" — ");
      out += `- ${parts || "(no date)"}\n`;
    }
  }
  return out;
}

/**
 * Renders contractual terms (consortium / subcontracting rules, business and
 * payment terms, remedies notice). Returns null when every displayable term is
 * empty, so the section is skipped rather than shown with a lone header.
 */
function formatTermsSection(details: PublicationDetails, lang: Language): string | null {
  const terms = details.terms;
  if (!terms) return null;

  const termsNote = terms.termsNote ? getTranslation(terms.termsNote, lang) : "";
  const remedies = terms.remediesNotice ? getTranslation(terms.remediesNotice, lang) : "";
  const termsOfBusiness = terms.termsOfBusiness
    ? getTranslation(terms.termsOfBusiness, lang)
    : "";
  const termsOfPayment = terms.termsOfPayment
    ? getTranslation(terms.termsOfPayment, lang)
    : "";

  const hasAny =
    terms.consortiumAllowed ||
    terms.subContractorAllowed ||
    terms.termsType ||
    termsNote ||
    remedies ||
    termsOfBusiness ||
    termsOfPayment;
  if (!hasAny) return null;

  let out = `### Conditions\n`;
  if (terms.consortiumAllowed) {
    out += `- **Consortium allowed:** ${terms.consortiumAllowed}\n`;
  }
  if (terms.subContractorAllowed) {
    out += `- **Subcontracting allowed:** ${terms.subContractorAllowed}\n`;
  }
  if (terms.termsType) {
    out += `- **Terms type:** ${terms.termsType}\n`;
  }
  if (termsNote) {
    out += `- **Terms note:** ${escapeInlineCode(termsNote)}\n`;
  }
  if (termsOfBusiness) {
    out += `- **Terms of business:** ${escapeInlineCode(termsOfBusiness)}\n`;
  }
  if (termsOfPayment) {
    out += `- **Terms of payment:** ${escapeInlineCode(termsOfPayment)}\n`;
  }
  if (remedies) {
    out += `- **Remedies notice:** ${escapeInlineCode(remedies)}\n`;
  }
  return out;
}

/**
 * Renders qualification and award criteria (counts + notes).
 * Returns null when no criteria metadata is present on the publication.
 */
function formatCriteriaSection(
  details: PublicationDetails,
  lang: Language
): string | null {
  const criteria = details.criteria;
  if (!criteria) return null;

  const qualNote = criteria.qualificationCriteriaNote
    ? getTranslation(criteria.qualificationCriteriaNote, lang)
    : "";
  const awardNote = criteria.awardCriteriaNote
    ? getTranslation(criteria.awardCriteriaNote, lang)
    : "";
  const qualCount = criteria.qualificationCriteria?.length ?? 0;
  const awardCount = criteria.awardCriteria?.length ?? 0;

  const hasAny =
    criteria.qualificationCriteriaInDocuments ||
    criteria.awardCriteriaSelection ||
    qualNote ||
    awardNote ||
    qualCount > 0 ||
    awardCount > 0;
  if (!hasAny) return null;

  let out = `### Criteria\n`;
  if (criteria.qualificationCriteriaInDocuments) {
    out += `- **Qualification criteria in documents:** ${criteria.qualificationCriteriaInDocuments}\n`;
  }
  if (qualCount > 0) {
    out += `- **Qualification criteria listed:** ${qualCount}\n`;
  }
  if (qualNote) {
    out += `- **Qualification criteria note:** ${escapeInlineCode(qualNote)}\n`;
  }
  if (criteria.awardCriteriaSelection) {
    out += `- **Award criteria selection:** ${criteria.awardCriteriaSelection}\n`;
  }
  if (awardCount > 0) {
    out += `- **Award criteria listed:** ${awardCount}\n`;
  }
  if (awardNote) {
    out += `- **Award criteria note:** ${escapeInlineCode(awardNote)}\n`;
  }
  return out;
}

/**
 * Renders award decision data (decision date, submissions count, winning
 * vendors with price/rank). Returns null on tender-type publications that have
 * not yet reached the award stage — i.e. when `details.decision` is absent.
 */
function formatAwardDecisionSection(
  details: PublicationDetails,
  lang: Language
): string | null {
  const decision = details.decision;
  if (!decision) return null;

  const vendors = decision.vendors ?? [];
  const hasAny =
    decision.awardDecisionDate ||
    decision.numberOfSubmissions != null ||
    decision.totalPriceSelection ||
    vendors.length > 0;
  if (!hasAny) return null;

  let out = `### Award Decision\n`;
  if (decision.awardDecisionDate) {
    out += `- **Decision Date:** ${decision.awardDecisionDate}\n`;
  }
  if (decision.numberOfSubmissions != null) {
    out += `- **Number of Submissions:** ${decision.numberOfSubmissions}\n`;
  }
  if (decision.totalPriceSelection) {
    out += `- **Total Price Basis:** ${decision.totalPriceSelection}\n`;
  }
  if (vendors.length > 0) {
    out += `\n**Awardees:**\n`;
    for (const v of vendors) {
      const name = v.vendorName || "(unnamed)";
      let line = `- ${name}`;
      if (v.price?.price != null) {
        const currency = (v.price.currency || "CHF").toUpperCase();
        line += ` — ${v.price.price} ${currency}`;
        if (v.price.vatType) line += ` (${v.price.vatType})`;
      }
      if (v.rank != null) line += ` — rank ${v.rank}`;
      const note = v.note ? getTranslation(v.note, lang) : "";
      if (note) line += ` — ${escapeInlineCode(note)}`;
      out += `${line}\n`;
    }
  }
  return out;
}

/**
 * Renders the list of publishing organisations attached to the publication.
 * Returns null when the publishers array is empty, to avoid an empty section.
 */
function formatPublishersSection(details: PublicationDetails): string | null {
  const publishers = details.publishers ?? [];
  if (publishers.length === 0) return null;
  let out = `### Publishers\n`;
  for (const p of publishers) {
    const name = p.name || "(unnamed)";
    const id = p.id ? ` (${p.id})` : "";
    out += `- ${name}${id}\n`;
  }
  return out;
}

/**
 * Creates a markdown header with optional count.
 */
export function formatHeader(title: string, count?: number): string {
  if (count !== undefined) {
    return `# ${title}\n\n**${count} result(s)**\n\n`;
  }
  return `# ${title}\n\n`;
}
