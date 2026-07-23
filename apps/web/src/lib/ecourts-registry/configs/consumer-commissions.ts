import type { CourtSystemConfig, SelectOption } from '../types';

/**
 * Consumer Commissions — the three-tier structure (District -> State ->
 * National Consumer Disputes Redressal Commission) under the Consumer
 * Protection Act is stable, well-known public structure, not eCourts-
 * specific data. State Commissions and the National Commission are each
 * one body per state/nationally, so their names can be generated safely.
 * District Commissions vary by district and aren't verified here, so
 * that tier degrades to free-text — same honesty rule used throughout
 * this registry for anything below the state level that hasn't been
 * confirmed against an official source.
 */

function toOptions(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const COMMISSION_TIERS = ['District Commission', 'State Commission', 'National Commission'];

const CONSUMER_CASE_CATEGORIES = [
  'Consumer Complaint',
  'First Appeal',
  'Revision Petition',
  'Execution Application',
  'Other',
];

function commissionForSelection(selections: Record<string, string>): SelectOption[] | 'free-text' {
  const tier = selections.tier;
  const state = selections.state;
  if (!tier) return [];
  if (tier === 'National Commission') {
    return [{ value: 'National Consumer Disputes Redressal Commission, New Delhi', label: 'National Consumer Disputes Redressal Commission, New Delhi' }];
  }
  if (!state) return [];
  if (tier === 'State Commission') {
    const name = `${state} State Consumer Disputes Redressal Commission`;
    return [{ value: name, label: name }];
  }
  // District Commission: no verified per-district list yet.
  return 'free-text';
}

export const consumerCommissionsConfig: CourtSystemConfig = {
  id: 'consumer-commissions',
  label: 'Consumer Commissions',
  status: 'available',
  steps: [
    {
      kind: 'select',
      key: 'state',
      label: 'Select State / UT',
      placeholder: 'Select State / UT',
      options: toOptions(INDIAN_STATES_AND_UTS),
    },
    {
      kind: 'select',
      key: 'tier',
      label: 'Select Commission Tier',
      placeholder: 'Select Commission Tier',
      options: toOptions(COMMISSION_TIERS),
    },
    {
      kind: 'select',
      key: 'commission',
      label: 'Commission',
      placeholder: 'Commission',
      options: commissionForSelection,
      freeTextPlaceholder: 'Enter District Consumer Disputes Redressal Commission name',
    },
    {
      kind: 'search-method',
      key: 'searchMethod',
      label: 'Select Search Method',
      methods: [
        {
          key: 'case_number',
          label: 'Case Number',
          fields: [
            { key: 'caseType', label: 'Case Category', type: 'select', options: CONSUMER_CASE_CATEGORIES },
            { key: 'caseNumber', label: 'Case Number', type: 'text', placeholder: 'e.g. 401' },
            { key: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2025', maxLength: 4 },
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
              placeholder: 'e.g. Priya Mehta',
              helpText: 'Enter at least 3 characters — full or partial name.',
            },
          ],
        },
      ],
    },
  ],
};

export { CONSUMER_CASE_CATEGORIES };
