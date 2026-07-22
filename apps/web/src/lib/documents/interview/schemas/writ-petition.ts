import type { InterviewConfig } from '../types';
import type { EngineSchema } from '@/lib/interview-engine/types';
import { esc } from '../fill-template';

/**
 * Reference interview: High Courts → Writ Petition. Deliberately generic
 * — no state or specific High Court is hardcoded anywhere in this file;
 * the court name, bench, and jurisdiction are all interview answers
 * (Court Details, below), not template constants. This is the pattern
 * every future interview (Supreme Court SLPs, District Court plaints,
 * Magistrate Court complaints, tribunal filings, ...) follows: one schema
 * file like this one, plus one registry.ts entry — never a change to the
 * interview engine or the fill-template engine.
 *
 * This is a direct, field-for-field port of the interview this product
 * shipped on SurveyJS: every page, field, and the one conditional pair
 * (seekingInterimRelief) map onto the new engine's generic vocabulary
 * one-to-one. SurveyJS's own presentational config (showProgressBar,
 * progressBarType, showQuestionNumbers, showPreviewBeforeComplete,
 * completeText/previewText/editText) has no equivalent here — the engine
 * always shows progress and always reviews before submit, and the submit
 * button's label ("Generate Draft") is passed by GuidedInterview.tsx, not
 * stored in the schema, since it's a UI-composition decision, not an
 * interview-content one.
 */
const schema: EngineSchema = {
  pages: [
    {
      name: 'courtDetails',
      title: 'Court Details',
      fields: [
        { type: 'text', name: 'courtName', title: 'Name of the High Court', isRequired: true, placeholder: 'e.g. High Court of Delhi at New Delhi' },
        { type: 'text', name: 'courtBench', title: 'Bench (if applicable)', placeholder: 'e.g. Principal Bench' },
        { type: 'text', name: 'caseNumber', title: 'Writ Petition Number (leave blank if not yet assigned)' },
        { type: 'text', name: 'caseYear', title: 'Year', isRequired: true, inputType: 'number' },
      ],
    },
    {
      name: 'caseInformation',
      title: 'Case Information',
      fields: [
        {
          type: 'dropdown',
          name: 'writArticle',
          title: 'Constitutional provision invoked',
          isRequired: true,
          choices: ['Article 226', 'Article 227', 'Articles 226 and 227'],
        },
      ],
    },
    {
      name: 'petitioners',
      title: 'Petitioner(s)',
      fields: [
        {
          type: 'group',
          name: 'petitioners',
          title: 'Petitioner details',
          itemLabel: 'Petitioner',
          minItems: 1,
          fields: [
            { type: 'text', name: 'name', title: 'Full name', isRequired: true },
            { type: 'text', name: 'parentage', title: "Son/daughter/wife of" },
            { type: 'text', name: 'address', title: 'Address', isRequired: true },
            { type: 'dropdown', name: 'capacity', title: 'Capacity', choices: ['Individual', 'Company', 'Partnership Firm', 'Other'], defaultValue: 'Individual' },
          ],
        },
      ],
    },
    {
      name: 'respondents',
      title: 'Respondent(s)',
      fields: [
        {
          type: 'group',
          name: 'respondents',
          title: 'Respondent details',
          itemLabel: 'Respondent',
          minItems: 1,
          fields: [
            { type: 'text', name: 'name', title: 'Full name / designation', isRequired: true },
            { type: 'text', name: 'description', title: 'Description (e.g. "State, through its Secretary")' },
            { type: 'text', name: 'address', title: 'Address', isRequired: true },
          ],
        },
      ],
    },
    {
      name: 'advocateDetails',
      title: 'Advocate Details',
      fields: [
        {
          type: 'group',
          name: 'advocates',
          title: 'Counsel for the Petitioner',
          itemLabel: 'Advocate',
          minItems: 1,
          fields: [
            { type: 'text', name: 'name', title: 'Full name', isRequired: true },
            { type: 'text', name: 'enrollmentNumber', title: 'Bar Council enrollment number', isRequired: true },
          ],
        },
      ],
    },
    {
      name: 'jurisdiction',
      title: 'Jurisdiction',
      fields: [{ type: 'textarea', name: 'territorialJurisdiction', title: 'Basis on which this Court has territorial jurisdiction', isRequired: true }],
    },
    {
      name: 'causeOfAction',
      title: 'Cause of Action',
      fields: [
        { type: 'text', name: 'causeOfActionDate', title: 'Date the cause of action arose' },
        { type: 'textarea', name: 'causeOfActionDescription', title: 'Describe the cause of action', isRequired: true },
      ],
    },
    {
      name: 'facts',
      title: 'Facts of the Case',
      fields: [{ type: 'textarea', name: 'facts', title: 'State the facts giving rise to this petition', isRequired: true, rows: 6 }],
    },
    {
      name: 'grounds',
      title: 'Grounds',
      fields: [{ type: 'textarea', name: 'grounds', title: 'Grounds on which relief is sought', isRequired: true, rows: 6 }],
    },
    {
      name: 'interimRelief',
      title: 'Interim Relief',
      fields: [
        { type: 'boolean', name: 'seekingInterimRelief', title: 'Are you seeking interim relief?', defaultValue: false },
        {
          type: 'textarea',
          name: 'interimReliefDetails',
          title: 'Describe the interim relief sought',
          visibleIf: { field: 'seekingInterimRelief', equals: true },
          requiredIf: { field: 'seekingInterimRelief', equals: true },
        },
      ],
    },
    {
      name: 'finalRelief',
      title: 'Final Relief',
      fields: [{ type: 'textarea', name: 'mainRelief', title: 'Relief(s) sought from this Hon’ble Court', isRequired: true, rows: 4 }],
    },
    {
      name: 'annexures',
      title: 'Annexures',
      fields: [
        {
          type: 'group',
          name: 'annexures',
          title: 'Documents annexed to this petition',
          itemLabel: 'Annexure',
          minItems: 0,
          fields: [
            { type: 'text', name: 'label', title: 'Annexure label', placeholder: 'e.g. Annexure P-1' },
            { type: 'text', name: 'description', title: 'Description', isRequired: true },
          ],
        },
      ],
    },
    {
      name: 'verification',
      title: 'Verification',
      fields: [
        { type: 'text', name: 'verificationPlace', title: 'Place', isRequired: true },
        { type: 'text', name: 'verificationDate', title: 'Date', isRequired: true },
        { type: 'text', name: 'deponentName', title: 'Deponent name', isRequired: true },
      ],
    },
  ],
};

/**
 * Master draft HTML: the same bracket-token convention the existing
 * static templates (templates.ts) already use, with tokens for the
 * generic court/petitioner/respondent/annexure fields this interview
 * collects — no state or specific court's name appears here. Byte-for-
 * byte identical to the pre-migration template: the document-generation
 * pipeline is explicitly out of scope for this migration.
 */
const html = `
<h2 style="text-align: center">IN THE [COURT_NAME]</h2>
[BENCH_BLOCK]
<p style="text-align: center">(EXERCISING JURISDICTION UNDER [WRIT_ARTICLE] OF THE CONSTITUTION OF INDIA)</p>
<p style="text-align: center"><strong>W.P. No. [CASE_NUMBER] of [CASE_YEAR]</strong></p>
<p>&nbsp;</p>
<p><strong>IN THE MATTER OF:</strong></p>
[PETITIONERS_BLOCK]
<p style="text-align: center">VERSUS</p>
[RESPONDENTS_BLOCK]
<p>&nbsp;</p>
<h3 style="text-align: center">PETITION UNDER [WRIT_ARTICLE] OF THE CONSTITUTION OF INDIA</h3>
<p><strong>MOST RESPECTFULLY SHOWETH:</strong></p>
<h3>JURISDICTION</h3>
<p>[TERRITORIAL_JURISDICTION]</p>
<h3>CAUSE OF ACTION</h3>
<p>The cause of action for filing the present petition arose on [COA_DATE]. [COA_DESCRIPTION]</p>
<h3>FACTS OF THE CASE</h3>
<p>[FACTS]</p>
<h3>GROUNDS</h3>
<p>[GROUNDS]</p>
[INTERIM_RELIEF_BLOCK]
<h3>PRAYER</h3>
<p>In view of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to grant the following relief(s):</p>
<p>[MAIN_RELIEF]</p>
<p>AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL AS IN DUTY BOUND EVER PRAY.</p>
<div data-page-break="true"></div>
<h3>LIST OF ANNEXURES</h3>
[ANNEXURES_BLOCK]
<h3>VERIFICATION</h3>
<p>Verified at [VERIFICATION_PLACE] on this [VERIFICATION_DATE] that the contents of the above petition are true and correct to the best of knowledge and belief and nothing material has been concealed therefrom.</p>
<p><strong>Deponent:</strong> [DEPONENT_NAME]</p>
[ADVOCATES_BLOCK]
`.trim();

export const WRIT_PETITION_TEMPLATE_HTML = html;

export const WRIT_PETITION_INTERVIEW: InterviewConfig = {
  id: 'high-court-writ-petition',
  templateId: 'in-high-court-writ-petition-guided',
  title: 'Writ Petition — Guided Interview',
  schema,
  scalarFields: {
    courtName: '[COURT_NAME]',
    caseNumber: '[CASE_NUMBER]',
    caseYear: '[CASE_YEAR]',
    writArticle: '[WRIT_ARTICLE]',
    territorialJurisdiction: '[TERRITORIAL_JURISDICTION]',
    causeOfActionDate: '[COA_DATE]',
    causeOfActionDescription: '[COA_DESCRIPTION]',
    facts: '[FACTS]',
    grounds: '[GROUNDS]',
    mainRelief: '[MAIN_RELIEF]',
    verificationPlace: '[VERIFICATION_PLACE]',
    verificationDate: '[VERIFICATION_DATE]',
    deponentName: '[DEPONENT_NAME]',
  },
  listFields: {
    '[PETITIONERS_BLOCK]': {
      questionName: 'petitioners',
      renderItem: (item, i) =>
        `<p>${esc(item.name)}${item.parentage ? `<br/>${esc(item.capacity === 'Individual' ? 'S/o/D/o/W/o' : 'Through')} ${esc(item.parentage)}` : ''}<br/>${esc(item.address)}<br/>... Petitioner No. ${i + 1}</p>`,
      empty: '<p>&nbsp;</p>',
    },
    '[RESPONDENTS_BLOCK]': {
      questionName: 'respondents',
      renderItem: (item, i) =>
        `<p>${esc(item.name)}${item.description ? `<br/>${esc(item.description)}` : ''}<br/>${esc(item.address)}<br/>... Respondent No. ${i + 1}</p>`,
      empty: '<p>&nbsp;</p>',
    },
    '[ANNEXURES_BLOCK]': {
      questionName: 'annexures',
      renderItem: (item, i) => `<p>${esc(item.label) || `Annexure P-${i + 1}`}: ${esc(item.description)}</p>`,
      empty: '<p>None.</p>',
    },
    '[ADVOCATES_BLOCK]': {
      questionName: 'advocates',
      renderItem: (item) =>
        `<p style="text-align: right">${esc(item.name)}${item.enrollmentNumber ? ` (${esc(item.enrollmentNumber)})` : ''}<br/>Counsel for the Petitioner</p>`,
      empty: '<p style="text-align: right">Counsel for the Petitioner</p>',
    },
  },
  blockFields: {
    '[BENCH_BLOCK]': (answers) =>
      answers.courtBench ? `<p style="text-align: center">${esc(answers.courtBench)}</p>` : '',
    '[INTERIM_RELIEF_BLOCK]': (answers) =>
      answers.seekingInterimRelief
        ? `<h3>INTERIM RELIEF</h3><p>${esc(answers.interimReliefDetails)}</p>`
        : '',
  },
  // Descriptive only — see InterviewMetadata. Nothing in this file's
  // schema/scalarFields/listFields/blockFields reads these values; they're
  // here for future filtering/search/analytics/permissions/AI/Matter
  // Register/Clause Assembly consumers.
  metadata: {
    courtVertical: 'HIGH_COURTS',
    courtType: 'High Court',
    practiceArea: 'Constitutional',
    documentType: 'PETITION',
    category: 'Writ Petition',
    version: 'v1.0',
    jurisdictionScope: 'STATE',
    applicableCourts: ['All High Courts (court name supplied as an interview answer)'],
    requiredAttachments: ['Vakalatnama', 'Affidavit in support', 'Annexures as listed in the petition'],
    supportedLanguages: ['en'],
    aiCompatible: false,
    clauseAssemblyCompatible: false,
  },
};
