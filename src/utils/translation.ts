/**
 * Translation utilities for multilingual content.
 */

import type { Translation, Language } from "../types/index.js";

/**
 * Extracts translated text with fallback chain.
 * Fallback order: requested language → de → fr → en → it
 *
 * @param t - Translation object
 * @param preferredLang - Preferred language
 * @returns Translated text or empty string
 */
export function getTranslation(
  t: Translation | null | undefined,
  preferredLang: Language = "fr"
): string {
  if (!t) return "";
  return t[preferredLang] || t.de || t.fr || t.en || t.it || "";
}
