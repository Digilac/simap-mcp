/**
 * Types for SIMAP API responses.
 */

import type { Translation, Pagination } from "./common.js";

/**
 * Custom error for SIMAP API errors.
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
  lotTitle: Translation;
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
    lotTitle: Translation;
    latestPublication?: {
      publicationNumber?: string | null;
      publicationDate?: string | null;
    } | null;
  }> | null;
}

/**
 * Publication details (partial - API returns complex nested structure).
 */
export interface PublicationDetails {
  type?: string | null;
  "project-info"?: {
    title?: Translation | null;
    description?: Translation | null;
  } | null;
  procurement?: {
    estimatedValue?: {
      value: number;
      currency?: string | null;
    } | null;
    cpvCodes?: string[] | null;
  } | null;
  deadlines?: {
    offerDeadline?: string | null;
    questionDeadline?: string | null;
  } | null;
  contact?: {
    organization?: Translation | null;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  decision?: {
    awardees?: Array<{
      name?: string | null;
      organization?: Translation | null;
      price?: {
        value: number;
        currency?: string | null;
      } | null;
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
