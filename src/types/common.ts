/**
 * Common types shared across the application.
 */

/**
 * Multilingual text with translations in Swiss national languages + English.
 */
export interface Translation {
  de?: string;
  fr?: string;
  it?: string;
  en?: string;
}

/**
 * Supported languages.
 */
export type Language = "de" | "fr" | "it" | "en";

/**
 * Pagination information for search results.
 */
export interface Pagination {
  lastItem?: string;
  itemsPerPage?: number;
}
