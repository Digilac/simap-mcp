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
  city?: string;
  canton?: string;
  country?: string;
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
  orderAddress?: OrderAddress;
  lots?: LotEntry[];
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
  projectNumber?: string;
  title?: Translation;
  projectSubType?: string;
  processType?: string;
  latestPublication?: {
    publicationDate?: string;
    publicationNumber?: string;
    pubType?: string;
  };
  lots?: Array<{
    lotNumber: number;
    lotTitle: Translation;
    latestPublication?: {
      publicationNumber?: string;
      publicationDate?: string;
    };
  }>;
}

/**
 * Publication details (partial - API returns complex nested structure).
 */
export interface PublicationDetails {
  type?: string;
  "project-info"?: {
    title?: Translation;
    description?: Translation;
  };
  procurement?: {
    estimatedValue?: {
      value: number;
      currency?: string;
    };
    cpvCodes?: string[];
  };
  deadlines?: {
    offerDeadline?: string;
    questionDeadline?: string;
  };
  contact?: {
    organization?: Translation;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  decision?: {
    awardees?: Array<{
      name?: string;
      organization?: Translation;
      price?: {
        value: number;
        currency?: string;
      };
    }>;
  };
  [key: string]: unknown;
}

/**
 * CPV code entry from search results.
 * Note: API returns nested structure with `label` for translations.
 */
export interface CPVCode {
  code: string;
  label: Translation;
  codes?: CPVCode[];
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
