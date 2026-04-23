/**
 * Types for simap API responses.
 */

import type { Translation, Pagination } from "./common.js";

/**
 * Custom error for simap API errors.
 */
export class SimapApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "SimapApiError";
  }
}

/**
 * Lot entry in a project.
 */
export interface LotEntry {
  lotId: string;
  lotNumber: number;
  lotTitle?: Translation | null;
  publicationId: string;
  publicationDate: string;
}

/**
 * Order address information.
 */
export interface OrderAddress {
  city?: string | Translation | null;
  canton?: string | null;
  cantonId?: string | null;
  country?: string | null;
  countryId?: string | null;
  postalCode?: string | null;
}

/**
 * Project entry from search results.
 */
export interface ProjectSearchEntry {
  id: string;
  title: Translation;
  projectNumber: string;
  projectType: string;
  projectSubType: string;
  processType: string;
  lotsType: string;
  publicationId: string;
  publicationDate: string;
  publicationNumber: string;
  pubType: string;
  corrected: boolean;
  procOfficeName: Translation;
  orderAddress?: OrderAddress | null;
  lots?: LotEntry[] | null;
}

/**
 * Response from project search endpoint.
 */
export interface ProjectsSearchResponse {
  projects: ProjectSearchEntry[];
  pagination: Pagination;
}

/**
 * Project header information.
 */
export interface ProjectHeader {
  projectNumber?: string | null;
  title?: Translation | null;
  projectSubType?: string | null;
  processType?: string | null;
  latestPublication?: {
    publicationDate?: string | null;
    publicationNumber?: string | null;
    pubType?: string | null;
  } | null;
  lots?: Array<{
    lotNumber: number;
    lotTitle?: Translation | null;
    latestPublication?: {
      publicationNumber?: string | null;
      publicationDate?: string | null;
    } | null;
  }> | null;
}

/**
 * CPV code object as returned inline in publication details
 * (single code + label, not to be confused with the array-based CPVCode).
 */
export interface PublicationCpvCode {
  code: string;
  label?: Translation | null;
}

/**
 * Publication details. simap returns a complex structure whose shape varies
 * by publication `type` (tender / award / direct_award / ...). We model only
 * the fields we render; `[key: string]: unknown` (via `.passthrough()` on the
 * Zod side) preserves anything else for the `fullRaw` output mode.
 */
export interface PublicationDetails {
  id?: string | null;
  type?: string | null;
  projectType?: string | null;
  hasProjectDocuments?: boolean | null;
  base?: {
    id?: string | null;
    type?: string | null;
    projectType?: string | null;
    projectId?: string | null;
    projectNumber?: string | null;
    publicationNumber?: string | null;
    publicationDate?: string | null;
    title?: Translation | null;
    processType?: string | null;
    orderType?: string | null;
    lotsType?: string | null;
    cpvCode?: PublicationCpvCode | null;
    procOfficeId?: string | null;
    creationLanguage?: string | null;
  } | null;
  "project-info"?: {
    title?: Translation | null;
    processType?: string | null;
    orderType?: string | null;
  } | null;
  procurement?: {
    orderDescription?: Translation | null;
    cpvCode?: PublicationCpvCode | null;
    processType?: string | null;
    orderType?: string | null;
  } | null;
  dates?: {
    publicationDate?: string | null;
    offerDeadline?: string | null;
    offerOpening?: {
      dateTime?: string | null;
      ignoreTime?: boolean | null;
    } | null;
    offerValidityDeadlineDays?: number | null;
    offerValidityDeadlineDate?: string | null;
    qnas?: Array<{
      id?: string | null;
      date?: string | null;
      note?: Translation | null;
      externalLink?: string | null;
    }> | null;
  } | null;
  terms?: {
    consortiumAllowed?: string | null;
    subContractorAllowed?: string | null;
    termsType?: string | null;
    termsNote?: Translation | null;
    termsOfBusiness?: Translation | null;
    termsOfPayment?: Translation | null;
    remediesNotice?: Translation | null;
  } | null;
  criteria?: {
    qualificationCriteriaInDocuments?: string | null;
    qualificationCriteria?: unknown[] | null;
    qualificationCriteriaNote?: Translation | null;
    awardCriteriaSelection?: string | null;
    awardCriteria?: unknown[] | null;
    awardCriteriaNote?: Translation | null;
  } | null;
  publishers?: Array<{
    id?: string | null;
    name?: string | null;
  }> | null;
  lots?: unknown[] | null;
  decision?: {
    awardDecisionDate?: string | null;
    numberOfSubmissions?: number | null;
    totalPriceSelection?: string | null;
    vendors?: Array<{
      vendorId?: string | null;
      vendorName?: string | null;
      price?: {
        currency?: string | null;
        price?: number | null;
        vatType?: string | null;
      } | null;
      note?: Translation | null;
      rank?: number | null;
    }> | null;
  } | null;
  [key: string]: unknown;
}

/**
 * CPV code entry from search results.
 * Note: API returns nested structure with `label` for translations.
 */
export interface CPVCode {
  code: string;
  label: Translation;
  codes?: CPVCode[] | null;
}

/**
 * Response from CPV code search endpoint.
 */
export interface CPVSearchResponse {
  codes: CPVCode[];
}

/**
 * Generic code entry for BKP, NPK, OAG nomenclatures.
 */
export interface CodeEntry {
  code: string;
  label: Translation;
}

/**
 * Generic response for code search endpoints (BKP, NPK, OAG).
 */
export interface CodeSearchResponse {
  codes: CodeEntry[];
}

/**
 * Canton entry.
 * Note: API uses `id` for the canton code (e.g., "VD", "GE").
 */
export interface Canton {
  id: string;
  nuts3: string;
}

/**
 * Response from cantons endpoint.
 */
export interface CantonsResponse {
  cantons: Canton[];
}

/**
 * Institution entry.
 * Note: `name` is a Translation object, not a string.
 */
export interface Institution {
  id: string;
  name: Translation;
  parentInstitutionId?: string | null;
}

/**
 * Response from institutions endpoint.
 */
export interface InstitutionsResponse {
  institutions: Institution[];
}

/**
 * Past publication entry from history endpoint.
 */
export interface PastPublicationEntry {
  id: string;
  publicationDate: string;
  lotNumber?: number | null;
  projectType: string;
  projectSubType: string;
  processType: string;
  publicationNumber: string;
  pubType: string;
  corrected: boolean;
}

/**
 * Response from past publications endpoint.
 */
export interface PastPublicationsResponse {
  pastPublications: PastPublicationEntry[];
}

/**
 * Procurement office type.
 */
export type ProcOfficeType =
  | "federal"
  | "cantonal"
  | "inter_cantonal"
  | "communal"
  | "other_communal"
  | "international";

/**
 * Procurement office public data.
 */
export interface ProcOfficePublicData {
  id: string;
  name: string;
  type: ProcOfficeType;
  institutionId: string;
  compCentreId: string;
}

/**
 * Response from proc offices public endpoint.
 */
export interface ProcOfficesPublicResponse {
  procOffices: ProcOfficePublicData[];
}
