import type { CourtSystemConfig } from '../types';

/**
 * Supreme Court of India — a single national forum, no state/district
 * geography step. Case categories are the standard, well-known
 * nomenclature the Supreme Court itself uses (Civil Appeal, Criminal
 * Appeal, SLP, Writ Petition under Article 32, Transfer Petition,
 * Contempt Petition, Review Petition, Curative Petition) — stable public
 * knowledge, not eCourts-specific data requiring separate verification.
 */
const SUPREME_COURT_CASE_CATEGORIES = [
  'Civil Appeal',
  'Criminal Appeal',
  'Special Leave Petition (Civil)',
  'Special Leave Petition (Criminal)',
  'Writ Petition (Civil) — Article 32',
  'Writ Petition (Criminal) — Article 32',
  'Transfer Petition (Civil)',
  'Transfer Petition (Criminal)',
  'Contempt Petition',
  'Review Petition',
  'Curative Petition',
  'Election Petition',
  'Other',
];

export const supremeCourtConfig: CourtSystemConfig = {
  id: 'supreme-court',
  label: 'Supreme Court of India',
  status: 'available',
  steps: [
    {
      kind: 'search-method',
      key: 'searchMethod',
      label: 'Select Search Method',
      methods: [
        {
          key: 'diary_number',
          label: 'Diary Number',
          fields: [
            { key: 'diaryNumber', label: 'Diary Number', type: 'text', placeholder: 'e.g. 12345' },
            { key: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2024', maxLength: 4 },
          ],
        },
        {
          key: 'case_number',
          label: 'Case Number',
          fields: [
            { key: 'caseType', label: 'Case Category', type: 'select', options: SUPREME_COURT_CASE_CATEGORIES },
            { key: 'caseNumber', label: 'Case Number', type: 'text', placeholder: 'e.g. 9981' },
            { key: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2024', maxLength: 4 },
          ],
        },
        {
          key: 'party_name',
          label: 'Party Name',
          fields: [
            {
              key: 'partyName',
              label: 'Party Name',
              type: 'text',
              placeholder: 'e.g. Union of India',
              helpText: 'Enter at least 3 characters — full or partial name.',
            },
          ],
        },
        {
          key: 'advocate_name',
          label: 'Advocate-on-Record',
          fields: [{ key: 'advocateName', label: 'Advocate-on-Record Name', type: 'text' }],
        },
      ],
    },
  ],
};

export { SUPREME_COURT_CASE_CATEGORIES };
