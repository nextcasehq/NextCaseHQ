/**
 * NextCaseHQ Interview Engine — the generic, reusable platform capability
 * behind every guided interview in the product. This module and everything
 * under components/interview-engine/ must never import, reference, or
 * contain a string constant naming any specific document type, court, or
 * legal concept. Its only contract is: schema in, validated answers out.
 *
 * Designed so a future AI authoring layer can insert a question, remove a
 * question, reorder questions, change validation, or append follow-up
 * questions/pages by editing plain data (an EngineSchema value) — never by
 * touching the renderer or this engine's own logic. See useInterviewEngine's
 * schema-resync effect for how the engine tolerates the schema changing
 * underneath an in-progress answer set.
 */

/** A structural equality condition — deliberately not a string expression
 *  language (SurveyJS's `'{x} = true'` style). Every condition this engine
 *  needs today is "does field X currently equal value Y", and keeping it a
 *  plain object avoids building/maintaining an expression parser for a need
 *  that doesn't exist yet. */
export interface EngineCondition {
  field: string;
  equals: unknown;
}

interface EngineFieldBase {
  /** Stable identifier — the key this field's answer is stored under. */
  name: string;
  title: string;
  description?: string;
  isRequired?: boolean;
  /** Field is required only when this condition holds, in addition to (not
   *  instead of) isRequired. */
  requiredIf?: EngineCondition;
  /** Field is rendered only when this condition holds. Hidden fields are
   *  never required and never validated. */
  visibleIf?: EngineCondition;
}

export interface TextField extends EngineFieldBase {
  type: 'text';
  placeholder?: string;
  inputType?: 'text' | 'number';
}

export interface TextAreaField extends EngineFieldBase {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
}

export interface DropdownField extends EngineFieldBase {
  type: 'dropdown';
  choices: string[];
  defaultValue?: string;
}

export interface BooleanField extends EngineFieldBase {
  type: 'boolean';
  defaultValue?: boolean;
}

/** A repeatable group of fields — the generic replacement for SurveyJS's
 *  `paneldynamic`. Each entry is one instance of `fields`, stored as one
 *  plain object in an array under `name` — the same shape the document
 *  generation pipeline's list fields already expect. */
export interface GroupField extends EngineFieldBase {
  type: 'group';
  /** Singular label for one entry, e.g. "Petitioner" — used in "Add
   *  another {itemLabel}" and per-entry headings. Purely display text; the
   *  engine attaches no meaning to it. */
  itemLabel: string;
  minItems?: number;
  maxItems?: number;
  fields: EngineField[];
}

export type EngineField = TextField | TextAreaField | DropdownField | BooleanField | GroupField;

export interface EnginePage {
  name: string;
  title: string;
  fields: EngineField[];
}

export interface EngineSchema {
  pages: EnginePage[];
}

/** What every field-level answer collapses to for a scalar field, or what
 *  one repeatable-group answer collapses to: an array of plain objects,
 *  one per entry — matching fill-template.ts's existing expectations
 *  exactly, since that pipeline is not changing. */
export type EngineAnswers = Record<string, unknown>;

export type EngineErrors = Record<string, string>;

export type EngineMode = 'filling' | 'review';
