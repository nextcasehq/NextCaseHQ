import { MOCK_MATTERS } from '@/app/dashboard/matters/mock-matters';

/**
 * Administrative Matter Register oversight — metadata only. Deliberately
 * does NOT read or expose matter.arguments, matter.evidence,
 * matter.research, matter.parties, or document contents — those are
 * confidential legal content, gated behind the separate
 * `view_confidential_matter_content` permission (see roles.ts) that no
 * platform-administration role holds by default. This module only ever
 * maps the non-confidential operational fields below.
 */
export interface MatterOversightRow {
  id: string;
  title: string;
  tenantLabel: string;
  status: string;
  category: string;
  stage: string;
  nextHearingDate: string | null;
  lastUpdated: string;
  documentCount: number;
  ecourtsLinked: boolean;
  needsRechecking: boolean;
  closed: boolean;
}

export function getMatterOversightRows(): MatterOversightRow[] {
  return MOCK_MATTERS.map((m) => ({
    id: m.id,
    title: m.title,
    tenantLabel: 'Adv. Kavita Deshmukh (Solo Practice)',
    status: m.status,
    category: m.category,
    stage: m.stage,
    nextHearingDate: m.nextHearingDate,
    lastUpdated: m.lastUpdated,
    documentCount: m.documents.length,
    ecourtsLinked: Boolean(m.ecourtsReference.cnrNumber),
    needsRechecking: m.ecourtsReference.verificationStatus === 'Needs rechecking',
    closed: m.status === 'Closed',
  }));
}
