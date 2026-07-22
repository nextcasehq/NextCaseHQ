/**
 * Registry types for the eCourts Case Status guided workflow. One court
 * system (District Courts, High Courts, Supreme Court, ...) is one
 * CourtSystemConfig; adding a future court system means writing one new
 * config file and registering it in registry.ts — no change to the wizard
 * component itself, which only ever asks "what kind is the current step?"
 * and renders the matching generic widget.
 *
 * Each court system's real official portal has a genuinely different step
 * shape (District Courts cascade through State/District/Court Establishment;
 * High Courts use State+Bench; Supreme Court has no geography step at all)
 * — verified against each portal before being modeled, not assumed. See
 * configs/district-courts.ts for the one fully specified today.
 */

/** A select step's option list can depend on prior selections (e.g. the
 * district list depends on the chosen state). When no verified list exists
 * yet for a given selection (e.g. court establishments for most districts),
 * the resolver returns 'free-text' so the same step degrades gracefully to
 * a labelled text input instead of a fabricated dropdown. */
export type OptionsResolver =
  | string[]
  | 'free-text'
  | ((selections: Record<string, string>) => string[] | 'free-text');

export interface SelectStepConfig {
  kind: 'select';
  key: string;
  label: string;
  placeholder: string;
  options: OptionsResolver;
  /** Placeholder shown only when options resolves to 'free-text'. */
  freeTextPlaceholder?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: string[];
  maxLength?: number;
  helpText?: string;
}

export interface SearchMethodOption {
  key: string;
  label: string;
  fields: FieldConfig[];
}

export interface SearchMethodStepConfig {
  kind: 'search-method';
  key: string;
  label: string;
  methods: SearchMethodOption[];
}

export type StepConfig = SelectStepConfig | SearchMethodStepConfig;

export interface CourtSystemConfig {
  id: string;
  label: string;
  /** 'available' court systems have a real, verified `steps` sequence.
   * 'coming-soon' systems appear in the selector (so it's honest about
   * what NextCaseHQ eventually covers) but collect nothing — selecting one
   * shows a plain "not yet available" notice rather than fabricated
   * fields, since several of these court systems don't have a verified,
   * standardized self-service search to model yet. */
  status: 'available' | 'coming-soon';
  steps: StepConfig[];
}
