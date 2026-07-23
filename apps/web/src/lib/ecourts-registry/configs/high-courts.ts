import type { CourtSystemConfig, SelectOption } from '../types';

/**
 * High Courts — the 25 High Courts of India and the states/UTs each has
 * jurisdiction over is stable, well-documented public administrative/
 * judicial structure (unlike eCourts-specific data such as court
 * establishment names, this does not require per-district verification
 * against services.ecourts.gov.in). Circuit bench names/locations are
 * real but the complete, current list per High Court is not verified
 * here, so — same honesty rule as district-courts.ts's Court
 * Establishment tier — the bench step degrades to free-text rather than
 * guessing. Case categories are standard nomenclature used across Indian
 * High Courts generally, not a claim that every category applies to
 * every High Court's local rules.
 */

function toOptions(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

const HIGH_COURT_CASE_CATEGORIES = [
  'Writ Petition (Civil)',
  'Writ Petition (Criminal)',
  'Criminal Appeal',
  'Criminal Revision Petition',
  'Civil Revision Petition',
  'Regular First Appeal (RFA)',
  'Miscellaneous First Appeal (MFA)',
  'Company Petition',
  'Contempt Petition',
  'Public Interest Litigation (PIL)',
  'Election Petition',
  'Arbitration Petition',
  'Testamentary Petition',
  'Review Petition',
  'Other',
];

/** State/UT -> the High Court(s) with jurisdiction over it. Most states
 * map to exactly one High Court; a handful of High Courts have
 * jurisdiction over more than one state/UT (shown here as multiple
 * states resolving to the same High Court name), matching real
 * jurisdictional structure. */
const STATE_TO_HIGH_COURT: Record<string, string> = {
  'Uttar Pradesh': 'Allahabad High Court',
  'Andhra Pradesh': 'Andhra Pradesh High Court',
  Maharashtra: 'Bombay High Court',
  Goa: 'Bombay High Court',
  'Dadra and Nagar Haveli and Daman and Diu': 'Bombay High Court',
  'West Bengal': 'Calcutta High Court',
  'Andaman and Nicobar Islands': 'Calcutta High Court',
  Chhattisgarh: 'Chhattisgarh High Court',
  'Delhi (NCT)': 'Delhi High Court',
  Assam: 'Gauhati High Court',
  Nagaland: 'Gauhati High Court',
  Mizoram: 'Gauhati High Court',
  'Arunachal Pradesh': 'Gauhati High Court',
  Gujarat: 'Gujarat High Court',
  'Himachal Pradesh': 'Himachal Pradesh High Court',
  'Jammu and Kashmir': 'Jammu & Kashmir and Ladakh High Court',
  Ladakh: 'Jammu & Kashmir and Ladakh High Court',
  Jharkhand: 'Jharkhand High Court',
  Karnataka: 'Karnataka High Court',
  Kerala: 'Kerala High Court',
  Lakshadweep: 'Kerala High Court',
  'Madhya Pradesh': 'Madhya Pradesh High Court',
  'Tamil Nadu': 'Madras High Court',
  Puducherry: 'Madras High Court',
  Manipur: 'Manipur High Court',
  Meghalaya: 'Meghalaya High Court',
  Odisha: 'Orissa High Court',
  Bihar: 'Patna High Court',
  Punjab: 'Punjab and Haryana High Court',
  Haryana: 'Punjab and Haryana High Court',
  Chandigarh: 'Punjab and Haryana High Court',
  Rajasthan: 'Rajasthan High Court',
  Sikkim: 'Sikkim High Court',
  Telangana: 'Telangana High Court',
  Tripura: 'Tripura High Court',
  Uttarakhand: 'Uttarakhand High Court',
};

const STATES_WITH_HIGH_COURTS = Object.keys(STATE_TO_HIGH_COURT).sort();

function highCourtForState(selections: Record<string, string>): SelectOption[] | 'free-text' {
  const state = selections.state;
  if (!state) return [];
  const hc = STATE_TO_HIGH_COURT[state];
  return hc ? [{ value: hc, label: hc }] : 'free-text';
}

export const highCourtsConfig: CourtSystemConfig = {
  id: 'high-courts',
  label: 'High Courts',
  status: 'available',
  steps: [
    {
      kind: 'select',
      key: 'state',
      label: 'Select State / UT',
      placeholder: 'Select State / UT',
      options: toOptions(STATES_WITH_HIGH_COURTS),
    },
    {
      kind: 'select',
      key: 'highCourt',
      label: 'High Court',
      placeholder: 'High Court',
      options: highCourtForState,
      freeTextPlaceholder: 'Enter High Court name',
    },
    {
      kind: 'select',
      key: 'bench',
      label: 'Bench / Jurisdiction (if applicable)',
      placeholder: 'Principal Seat',
      // No verified, current bench list exists for any High Court yet —
      // always free-text rather than a guessed list, same rule as
      // Court Establishments in district-courts.ts. Leaving this
      // blank is a valid choice (most matters are at the Principal Seat).
      options: 'free-text',
      freeTextPlaceholder: 'e.g. Principal Seat, or a circuit bench name',
    },
    {
      kind: 'search-method',
      key: 'searchMethod',
      label: 'Select Search Method',
      methods: [
        {
          key: 'cnr',
          label: 'CNR Number',
          fields: [
            {
              key: 'cnrNumber',
              label: 'CNR Number',
              type: 'text',
              placeholder: 'e.g. KLHC010012342024',
              maxLength: 16,
              helpText: 'A 16-character alphanumeric CNR.',
            },
          ],
        },
        {
          key: 'case_number',
          label: 'Case Number',
          fields: [
            { key: 'caseType', label: 'Case Category', type: 'select', options: HIGH_COURT_CASE_CATEGORIES },
            { key: 'caseNumber', label: 'Case Number', type: 'text', placeholder: 'e.g. 4521' },
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
              placeholder: 'e.g. Ramesh Kumar',
              helpText: 'Enter at least 3 characters — full or partial name.',
            },
          ],
        },
        {
          key: 'advocate_name',
          label: 'Advocate Name',
          fields: [{ key: 'advocateName', label: 'Advocate Name', type: 'text' }],
        },
      ],
    },
  ],
};

export { HIGH_COURT_CASE_CATEGORIES };
