import type { CourtSystemConfig } from './types';
import { districtCourtsConfig } from './configs/district-courts';

/**
 * The one place every court system is registered. Adding a future court
 * system (High Courts, Supreme Court, ...) means adding one config object
 * here — no change anywhere else, including the wizard component.
 *
 * Only District Courts is `status: 'available'` today — its step sequence
 * and fields were verified against services.ecourts.gov.in. The rest are
 * listed (so the selector honestly reflects what NextCaseHQ intends to
 * cover) but marked 'coming-soon' rather than modeled with guessed fields,
 * since several of these run on separate, non-eCourts portals whose real
 * self-service search shape hasn't been verified yet — see the eCourts
 * Case Status design discussion for the per-court verification notes.
 */
export const COURT_SYSTEMS: readonly CourtSystemConfig[] = [
  districtCourtsConfig,
  { id: 'high-courts', label: 'High Courts', status: 'coming-soon', steps: [] },
  { id: 'supreme-court', label: 'Supreme Court of India', status: 'coming-soon', steps: [] },
  { id: 'nclt', label: 'NCLT', status: 'coming-soon', steps: [] },
  { id: 'nclat', label: 'NCLAT', status: 'coming-soon', steps: [] },
  { id: 'consumer-commissions', label: 'Consumer Commissions', status: 'coming-soon', steps: [] },
  { id: 'rera', label: 'RERA', status: 'coming-soon', steps: [] },
  { id: 'drt-drat', label: 'DRT / DRAT', status: 'coming-soon', steps: [] },
  { id: 'cat', label: 'CAT', status: 'coming-soon', steps: [] },
  { id: 'armed-forces-tribunal', label: 'Armed Forces Tribunal', status: 'coming-soon', steps: [] },
  { id: 'itat', label: 'Income Tax Appellate Tribunal', status: 'coming-soon', steps: [] },
  { id: 'gstat', label: 'GST Appellate Tribunal (when available)', status: 'coming-soon', steps: [] },
];

export function getCourtSystem(id: string): CourtSystemConfig | undefined {
  return COURT_SYSTEMS.find((c) => c.id === id);
}
