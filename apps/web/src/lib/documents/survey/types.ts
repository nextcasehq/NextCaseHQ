/**
 * The Legal Interview Engine's shared data shape. Every guided interview —
 * regardless of court vertical (Supreme Court, High Courts, District
 * Courts, Magistrate Courts, Other Courts & Tribunals) or document type —
 * is one `InterviewConfig` value: a SurveyJS schema plus a description of
 * how its answers map onto a template's placeholder tokens. Adding a new
 * interview never requires new application code — only a new schema file
 * and one registry entry (see registry.ts) — because every court's
 * requirements are expressed as configuration/data here, never as
 * court-specific branches in the wizard or draft-generation code.
 */

/** A plain-text/number/dropdown answer substituted directly for a token, e.g. `[CASE_NUMBER]`. */
export type ScalarFieldMap = Record<string, string>;

/**
 * A repeatable section's (SurveyJS `paneldynamic`) answers rendered into
 * one HTML fragment — e.g. one `<p>` per petitioner — and substituted for
 * a single token, e.g. `[PETITIONERS_BLOCK]`.
 */
export interface ListFieldConfig {
  questionName: string;
  renderItem: (item: Record<string, unknown>, index: number) => string;
  /** Rendered when the repeatable section has zero entries. */
  empty?: string;
}

/**
 * A token whose replacement depends on more than one answer at once (most
 * commonly a conditional block, e.g. `[INTERIM_RELIEF_BLOCK]` only when
 * `seekingInterimRelief` is true) — still pure configuration, since the
 * function is supplied by the interview's own schema file, not the shared
 * engine.
 */
export type BlockFieldMap = Record<string, (answers: Record<string, unknown>) => string>;

export interface InterviewConfig {
  /** Unique id for this interview, used as the localStorage save/resume key. */
  id: string;
  /** The `LegalTemplate.id` (templates.ts) this interview generates a draft for. */
  templateId: string;
  title: string;
  surveyJson: Record<string, unknown>;
  scalarFields: ScalarFieldMap;
  listFields: Record<string, ListFieldConfig>;
  blockFields: BlockFieldMap;
}
