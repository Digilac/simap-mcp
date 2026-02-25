/**
 * SIMAP API endpoint definitions.
 */

export const SIMAP_API_BASE = "https://www.simap.ch/api";

export const ENDPOINTS = {
  // Publications
  PROJECT_SEARCH: "/publications/v2/project/project-search",
  PROJECT_HEADER: (projectId: string) =>
    `/publications/v2/project/${projectId}/project-header`,
  PUBLICATION_DETAILS: (projectId: string, publicationId: string) =>
    `/publications/v1/project/${projectId}/publication-details/${publicationId}`,
  PAST_PUBLICATIONS: (publicationId: string) =>
    `/publications/v1/publication/${publicationId}/past-publications`,

  // Codes / Nomenclature
  CPV_SEARCH: "/codes/v1/cpv/search",
  CPV_LIST: "/codes/v1/cpv",
  BKP_SEARCH: "/codes/v1/bkp/search",
  BKP_LIST: "/codes/v1/bkp",
  NPK_SEARCH: "/codes/v1/npk/search",
  NPK_LIST: "/codes/v1/npk",
  OAG_SEARCH: "/codes/v1/oag/search",
  OAG_LIST: "/codes/v1/oag",

  // Reference data
  CANTONS: "/cantons/v1",
  INSTITUTIONS: "/institutions/v1/institutions",
  PROC_OFFICES: "/procoffices/v1/po/public",
} as const;
