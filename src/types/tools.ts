/**
 * Types for MCP tool parameters.
 */

/**
 * Project subtypes for filtering tenders.
 */
export type ProjectSubType =
  | "construction"
  | "service"
  | "supply"
  | "project_competition"
  | "idea_competition"
  | "overall_performance_competition"
  | "project_study"
  | "idea_study"
  | "overall_performance_study"
  | "request_for_information";

/**
 * Process types (procurement procedures).
 */
export type ProcessType = "open" | "selective" | "invitation" | "direct" | "no_process";

/**
 * Publication types for filtering.
 */
export type PubTypeFilter =
  | "advance_notice"
  | "request_for_information"
  | "tender"
  | "competition"
  | "study_contract"
  | "award_tender"
  | "award_study_contract"
  | "award_competition"
  | "direct_award"
  | "participant_selection"
  | "selective_offering_phase"
  | "correction"
  | "revocation"
  | "abandonment";
