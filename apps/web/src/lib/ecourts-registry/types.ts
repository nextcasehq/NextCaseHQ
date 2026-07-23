/**
 * Registry types for the eCourts Case Status guided workflow. One court
 * system (District Courts, High Courts, Supreme Court, ...) is one
 * CourtSystemConfig; adding a future court system means writing one new
 * config file and registering it in registry.ts — no change to the wizard
 * component itself, which only ever asks "what kind is the current step?"
 * and renders the matching generic widget.
 *
 * The wizard's default, visible flow is always District Courts' real
 * hierarchy — State -> District -> Court Establishment -> Search Method
 * -> Search Fields — geography-first, with no "pick a court system" step
 * ahead of it. Other court systems (High Courts, Supreme Court, ...) stay
 * registered here as data (see registry.ts) for future extensibility, but
 * are not surfaced as a switcher in this wizard.
 */

/** A dropdown option. `meta` carries optional structured data about the
 * option itself — e.g. a Court Establishment's real official court type
 * (Civil Court, Magistrate Court, Family Court, ...), captured so the
 * wizard can display it and a future, verified pass can use it, without
 * fabricating any filtering behavior that hasn't been confirmed against
 * the real eCourts portal. */
export interface SelectOption {
  value: string;
  label: string;
  meta?: Record<string, string>;
}

/** A select step's option list can depend on prior selections (e.g. the
 * district list depends on the chosen state). When no verified list exists
 * yet for a given selection (e.g. court establishments for most districts),
 * the resolver returns 'free-text' so the same step degrades gracefully to
 * a labelled text input instead of a fabricated dropdown. */
export type OptionsResolver =
  | SelectOption[]
  | 'free-text'
  | ((selections: Record<string, string>) => SelectOption[] | 'free-text');

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
   * 'coming-soon' systems are registered (so future work has a real place
   * to land) but collect nothing yet, since several of these court
   * systems run on separate, non-eCourts portals whose self-service
   * search shape isn't verified. */
  status: 'available' | 'coming-soon';
  steps: StepConfig[];
}
