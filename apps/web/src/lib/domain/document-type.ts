/**
 * Product Owner-frozen vocabulary of 15 preparable document types (Milestone
 * 4, Prepare Document) — not expanded by this or any future milestone
 * without an explicit new decision. Structured (slug + label + category)
 * rather than free text scattered across forms, matching the precedent of
 * MATTER_STATUSES/MATTER_ENGAGEMENT_TYPES (lib/domain/matter.ts): a future
 * Legal Knowledge Graph migration promotes this literal array into a real
 * DocumentType table by seeding from it — no call site changes required.
 *
 * `slug` is the exact value stored in DocumentEnvelope.document_type and
 * checked by the documentenvelope_document_type_check DB constraint —
 * renaming a slug is a breaking migration for any already-saved document,
 * same rule as AI_OPERATION_TYPES (lib/ai/operation-types.ts).
 */
export const DOCUMENT_CATEGORIES = ['CIVIL', 'CRIMINAL', 'HIGH_COURT'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CIVIL: 'Civil',
  CRIMINAL: 'Criminal',
  HIGH_COURT: 'High Court',
};

export interface DocumentTypeDefinition {
  slug: string;
  label: string;
  category: DocumentCategory;
}

export const DOCUMENT_TYPES: readonly DocumentTypeDefinition[] = [
  { slug: 'PLAINT', label: 'Plaint', category: 'CIVIL' },
  { slug: 'WRITTEN_STATEMENT', label: 'Written Statement', category: 'CIVIL' },
  { slug: 'AFFIDAVIT', label: 'Affidavit', category: 'CIVIL' },
  { slug: 'INTERIM_APPLICATION', label: 'Interim Application', category: 'CIVIL' },
  { slug: 'LEGAL_NOTICE', label: 'Legal Notice', category: 'CIVIL' },

  { slug: 'BAIL_APPLICATION', label: 'Bail Application', category: 'CRIMINAL' },
  { slug: 'ANTICIPATORY_BAIL_APPLICATION', label: 'Anticipatory Bail Application', category: 'CRIMINAL' },
  { slug: 'CRIMINAL_COMPLAINT', label: 'Criminal Complaint', category: 'CRIMINAL' },
  { slug: 'OBJECTION_STATEMENT', label: 'Objection Statement', category: 'CRIMINAL' },
  { slug: 'PETITION', label: 'Petition', category: 'CRIMINAL' },

  { slug: 'WRIT_PETITION', label: 'Writ Petition', category: 'HIGH_COURT' },
  { slug: 'WRIT_APPEAL', label: 'Writ Appeal', category: 'HIGH_COURT' },
  { slug: 'REVISION_PETITION', label: 'Revision Petition', category: 'HIGH_COURT' },
  { slug: 'REVIEW_PETITION', label: 'Review Petition', category: 'HIGH_COURT' },
  { slug: 'MEMO', label: 'Memo', category: 'HIGH_COURT' },
] as const;

export type DocumentTypeSlug = (typeof DOCUMENT_TYPES)[number]['slug'];

export const DOCUMENT_TYPE_SLUGS: readonly string[] = DOCUMENT_TYPES.map((t) => t.slug);

export function getDocumentType(slug: string | null | undefined): DocumentTypeDefinition | undefined {
  if (!slug) return undefined;
  return DOCUMENT_TYPES.find((t) => t.slug === slug);
}

export function documentTypesByCategory(category: DocumentCategory): DocumentTypeDefinition[] {
  return DOCUMENT_TYPES.filter((t) => t.category === category);
}

export function isValidDocumentTypeSlug(slug: string): boolean {
  return DOCUMENT_TYPE_SLUGS.includes(slug);
}

/**
 * Category-scoped progressive facts — one shared set per category (3
 * forms), not a bespoke questionnaire per document type (15 forms) and
 * not one universal legal questionnaire. Drives both the /documents/new
 * form rendering and the fact block handed to the draft prompt.
 */
export interface FactField {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
}

export const DOCUMENT_FACT_FIELDS: Record<DocumentCategory, FactField[]> = {
  CIVIL: [
    { key: 'plaintiff_petitioner', label: 'Plaintiff / Petitioner', type: 'text', required: true },
    { key: 'defendant_respondent', label: 'Defendant / Respondent', type: 'text', required: true },
    { key: 'court_forum', label: 'Court / Forum', type: 'text', required: true },
    { key: 'facts_cause_of_action', label: 'Facts & Cause of Action', type: 'textarea', required: true },
    { key: 'reliefs_sought', label: 'Reliefs Sought', type: 'textarea', required: true },
    { key: 'additional_instructions', label: 'Additional Instructions', type: 'textarea', required: false },
  ],
  CRIMINAL: [
    { key: 'accused', label: 'Accused', type: 'text', required: true },
    { key: 'complainant_state', label: 'Complainant / State', type: 'text', required: true },
    { key: 'court_forum', label: 'Court / Forum', type: 'text', required: true },
    { key: 'offence_sections', label: 'Offence(s) & Sections', type: 'text', required: true },
    { key: 'facts', label: 'Facts', type: 'textarea', required: true },
    { key: 'additional_instructions', label: 'Additional Instructions', type: 'textarea', required: false },
  ],
  HIGH_COURT: [
    { key: 'petitioner_appellant', label: 'Petitioner / Appellant', type: 'text', required: true },
    { key: 'respondent', label: 'Respondent', type: 'text', required: true },
    { key: 'court_below_order_challenged', label: 'Court Below / Order Challenged', type: 'text', required: true },
    { key: 'grounds', label: 'Grounds', type: 'textarea', required: true },
    { key: 'facts', label: 'Facts', type: 'textarea', required: true },
    { key: 'additional_instructions', label: 'Additional Instructions', type: 'textarea', required: false },
  ],
};
