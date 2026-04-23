/**
 * Parameter mapping and query builder for `search_tenders`.
 *
 * The simap API uses different parameter names than our tool surface
 * (e.g. `cantons` → `orderAddressCantons`). Keeping the mapping and the
 * default-filter logic here — rather than hardcoded in the handler — makes
 * it easy to inspect, test, and extend.
 */

import type { SearchTendersInput } from "./search-tenders.js";

/**
 * User-facing parameter name → simap API query parameter name.
 *
 * Every key of SearchTendersInput (except `lang`, which does not hit the API
 * directly as a filter) should appear here so that the mapping is complete.
 */
export const SEARCH_TENDERS_PARAM_MAP = {
  search: "search",
  publicationFrom: "newestPublicationFrom",
  publicationUntil: "newestPublicationUntil",
  projectSubTypes: "projectSubTypes",
  cantons: "orderAddressCantons",
  processTypes: "processTypes",
  pubTypes: "newestPubTypes",
  cpvCodes: "cpvCodes",
  bkpCodes: "bkpCodes",
  issuedByOrganizations: "issuedByOrganizations",
  lastItem: "lastItem",
} as const;

type QueryValue = string | string[] | undefined;

/**
 * Builds the simap API query params for `search_tenders`, applying:
 * - user→API name mapping (see SEARCH_TENDERS_PARAM_MAP)
 * - empty arrays are skipped
 * - if no filter is provided, defaults to today's publications so the API
 *   call does not return the full dataset
 */
export function buildTenderSearchQuery(
  input: SearchTendersInput
): Record<string, QueryValue> {
  const {
    search,
    publicationFrom,
    publicationUntil,
    projectSubTypes,
    cantons,
    processTypes,
    pubTypes,
    cpvCodes,
    bkpCodes,
    issuedByOrganizations,
    lastItem,
  } = input;

  const q: Record<string, QueryValue> = {};
  const M = SEARCH_TENDERS_PARAM_MAP;

  if (search) q[M.search] = search;
  if (publicationFrom) q[M.publicationFrom] = publicationFrom;
  if (publicationUntil) q[M.publicationUntil] = publicationUntil;
  if (projectSubTypes && projectSubTypes.length > 0) {
    q[M.projectSubTypes] = projectSubTypes;
  }
  if (cantons && cantons.length > 0) {
    q[M.cantons] = cantons;
  }
  if (processTypes && processTypes.length > 0) q[M.processTypes] = processTypes;
  if (pubTypes && pubTypes.length > 0) q[M.pubTypes] = pubTypes;
  if (cpvCodes && cpvCodes.length > 0) q[M.cpvCodes] = cpvCodes;
  if (bkpCodes && bkpCodes.length > 0) q[M.bkpCodes] = bkpCodes;
  if (issuedByOrganizations && issuedByOrganizations.length > 0) {
    q[M.issuedByOrganizations] = issuedByOrganizations;
  }
  if (lastItem) q[M.lastItem] = lastItem;

  // At least one filter is required — default to today's publications.
  // Use Europe/Zurich calendar date: simap is a Swiss platform and a UTC
  // slice would flip a day near midnight for Swiss users.
  if (Object.keys(q).length === 0) {
    q[M.publicationFrom] = zurichTodayDate();
  }

  return q;
}

/** Returns today's date in Europe/Zurich as an ISO-8601 `YYYY-MM-DD` string. */
function zurichTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
