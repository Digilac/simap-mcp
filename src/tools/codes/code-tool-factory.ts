/**
 * Factories for the nomenclature tools.
 *
 * CPV, BKP, NPK and OAG each have a `search_<x>_codes` and a `browse_<x>_tree`
 * tool that differ only in endpoint and wording. The logic lives here once;
 * each tool file passes its own configuration and re-exports the resulting
 * schema and `register*()` function.
 */

import type { FastMCP } from "@prefecthq/fastmcp-ts/server";
import { z } from "zod";
import { REFERENCE_DATA_TTL_MS, simap } from "../../api/client.js";
import { CodeTreeResponseSchema } from "../../types/schemas.js";
import { toToolErrorResult } from "../../utils/errors.js";
import { formatInlineCode } from "../../utils/formatting.js";
import { registerTool } from "../../utils/register-tool.js";
import { getTranslation } from "../../utils/translation.js";

/** A code with its label and its children. */
type CodeNode = z.infer<typeof CodeTreeResponseSchema>["codes"][number];

interface CodeToolConfig {
  /** Nomenclature acronym as shown to the user, e.g. `CPV`. */
  acronym: string;
  /** One-line description shown to the client. */
  description: string;
  /** simap endpoint, from `ENDPOINTS`. */
  endpoint: string;
}

export interface SearchCodesToolConfig extends CodeToolConfig {
  /** Description of the `query` parameter. */
  queryDescription: string;
  /** Closing line telling the model what the codes are for. */
  footer: string;
}

export interface BrowseTreeToolConfig extends CodeToolConfig {
  /** Format a `parentCode` must match. */
  parentCodePattern: RegExp;
  /** Description of the `parentCode` parameter. */
  parentCodeDescription: string;
  /** Extra closing line, after the one that points back to the tool. */
  extraFooter?: string;
}

/** Lists a code and all its descendants, depth first. */
function flattenCodes(codes: CodeNode[], result: CodeNode[] = []): CodeNode[] {
  for (const code of codes) {
    result.push(code);
    if (code.codes && code.codes.length > 0) {
      flattenCodes(code.codes, result);
    }
  }
  return result;
}

/**
 * Builds a `search_<acronym>_codes` tool: keyword search in one nomenclature.
 * simap nests the matches under their parent categories; the tool lists the
 * whole branch, parents first.
 */
export function defineSearchCodesTool(config: SearchCodesToolConfig) {
  const { acronym } = config;
  const name = `search_${acronym.toLowerCase()}_codes`;

  const inputSchema = z.object({
    query: z.string().min(1).max(500).describe(config.queryDescription),
    lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Search language"),
  });

  async function handler({ query, lang }: z.infer<typeof inputSchema>) {
    try {
      const data = await simap.get(config.endpoint, {
        params: { query, language: lang },
        schema: CodeTreeResponseSchema,
        cacheTtlMs: REFERENCE_DATA_TTL_MS,
      });

      if (data.codes.length === 0) {
        return `No ${acronym} codes found for ${formatInlineCode(query)}.`;
      }

      const codes = flattenCodes(data.codes);

      let result = `# ${acronym} Codes for ${formatInlineCode(query)}\n\n`;
      result += `${codes.length} result(s) found.\n\n`;
      for (const item of codes) {
        result += `- **${item.code}** - ${getTranslation(item.label, lang)}\n`;
      }
      result += `\n${config.footer}`;

      return result;
    } catch (error) {
      return toToolErrorResult(error, {
        toolName: name,
        action: `searching ${acronym} codes`,
      });
    }
  }

  return {
    inputSchema,
    register(server: FastMCP): void {
      registerTool(
        server,
        {
          name,
          title: `Search ${acronym} Codes`,
          description: config.description,
          input: inputSchema,
        },
        handler
      );
    },
  };
}

/**
 * Builds a `browse_<acronym>_tree` tool: the root categories of one
 * nomenclature, or the direct children of `parentCode`.
 */
export function defineBrowseTreeTool(config: BrowseTreeToolConfig) {
  const { acronym } = config;
  const name = `browse_${acronym.toLowerCase()}_tree`;

  const inputSchema = z.object({
    parentCode: z
      .string()
      .regex(config.parentCodePattern)
      .optional()
      .describe(config.parentCodeDescription),
    lang: z.enum(["de", "fr", "it", "en"]).default("en").describe("Display language"),
  });

  async function handler({ parentCode, lang }: z.infer<typeof inputSchema>) {
    try {
      const data = await simap.get(config.endpoint, {
        params: parentCode ? { parentCode } : {},
        schema: CodeTreeResponseSchema,
        cacheTtlMs: REFERENCE_DATA_TTL_MS,
      });

      if (data.codes.length === 0) {
        return parentCode
          ? `No ${acronym} subcategories found for code \`${parentCode}\`.`
          : `No root ${acronym} categories found.`;
      }

      let result = parentCode
        ? `# ${acronym} Subcategories of \`${parentCode}\`\n\n`
        : `# Root ${acronym} Categories\n\n`;
      result += `${data.codes.length} category(ies) found.\n\n`;
      for (const item of data.codes) {
        const hasChildren = item.codes && item.codes.length > 0;
        const label = getTranslation(item.label, lang);
        result += `- **${item.code}** - ${label}${hasChildren ? " 📂" : ""}\n`;
      }
      result += `\n*Use ${name} with a parent code to see its subcategories.*`;
      if (config.extraFooter) {
        result += `\n${config.extraFooter}`;
      }

      return result;
    } catch (error) {
      return toToolErrorResult(error, {
        toolName: name,
        action: `browsing ${acronym} codes`,
      });
    }
  }

  return {
    inputSchema,
    register(server: FastMCP): void {
      registerTool(
        server,
        {
          name,
          title: `Browse ${acronym} Tree`,
          description: config.description,
          input: inputSchema,
        },
        handler
      );
    },
  };
}
