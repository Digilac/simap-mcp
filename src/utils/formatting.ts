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
 * Builds the SIMAP.ch URL for a project.
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
  result += `- **SIMAP Link:** ${simapUrl}\n`;
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
    if (addr.city || addr.canton) {
      result += `- **Location:** ${[addr.city, addr.canton].filter(Boolean).join(", ")}\n`;
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
    result += `- **SIMAP Link:** ${buildSimapUrl(projectId, lang)}\n`;
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
 */
export function formatPublicationDetails(
  details: PublicationDetails,
  lang: Language
): string {
  let result = `## Publication Details\n\n`;
  result += `- **Publication Type:** ${details.type || "N/A"}\n`;

  // Project info
  if (details["project-info"]) {
    const info = details["project-info"];
    result += `\n### Project Information\n`;

    if (info.title) {
      result += `- **Title:** ${getTranslation(info.title, lang)}\n`;
    }
    if (info.description) {
      result += `- **Description:** ${getTranslation(info.description, lang)}\n`;
    }
  }

  // Procurement info
  if (details.procurement) {
    const proc = details.procurement;
    result += `\n### Procurement Details\n`;

    if (proc.estimatedValue) {
      result += `- **Estimated Value:** ${proc.estimatedValue.value} ${proc.estimatedValue.currency || "CHF"}\n`;
    }

    if (proc.cpvCodes && proc.cpvCodes.length > 0) {
      result += `- **CPV Codes:** ${proc.cpvCodes.join(", ")}\n`;
    }
  }

  // Deadlines
  if (details.deadlines) {
    const dl = details.deadlines;
    result += `\n### Deadlines\n`;

    if (dl.offerDeadline) {
      result += `- **Submission Deadline:** ${dl.offerDeadline}\n`;
    }
    if (dl.questionDeadline) {
      result += `- **Question Deadline:** ${dl.questionDeadline}\n`;
    }
  }

  // Contact
  if (details.contact) {
    const contact = details.contact;
    result += `\n### Contact\n`;

    if (contact.organization) {
      result += `- **Organization:** ${getTranslation(contact.organization, lang)}\n`;
    }
    if (contact.contactPerson) {
      result += `- **Contact Person:** ${contact.contactPerson}\n`;
    }
    if (contact.email) {
      result += `- **Email:** ${contact.email}\n`;
    }
    if (contact.phone) {
      result += `- **Phone:** ${contact.phone}\n`;
    }
  }

  // Award (if present)
  if (details.decision && details.type === "award") {
    result += `\n### Award Decision\n`;

    if (details.decision.awardees && details.decision.awardees.length > 0) {
      result += `\n**Awardees:**\n`;
      for (const awardee of details.decision.awardees) {
        result += `- ${awardee.name || getTranslation(awardee.organization, lang)}`;
        if (awardee.price) {
          result += ` - ${awardee.price.value} ${awardee.price.currency || "CHF"}`;
        }
        result += `\n`;
      }
    }
  }

  return result;
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

/**
 * Truncates JSON for display.
 */
export function formatJsonPreview(data: unknown, maxLength = 3000): string {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= maxLength) {
    return json;
  }
  const truncated = json.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf("\n");
  return (
    (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) +
    "\n... (truncated)"
  );
}
