import type { CourtSystemConfig } from './types';
import { districtCourtsConfig } from './configs/district-courts';
import { highCourtsConfig } from './configs/high-courts';
import { supremeCourtConfig } from './configs/supreme-court';
import { consumerCommissionsConfig } from './configs/consumer-commissions';

/**
 * The one place every court system is registered. Adding a future court
 * system means adding one config object here — no change anywhere else,
 * including the wizard component.
 *
 * District Courts, High Courts, Supreme Court, and Consumer Commissions
 * are `status: 'available'`: their geography/jurisdiction structure is
 * stable, well-documented public administrative/judicial fact (not
 * eCourts-specific data), with any tier below that (Court Establishment,
 * High Court bench, District Consumer Commission) degrading honestly to
 * free-text rather than a guessed list wherever it hasn't been verified
 * against an official source — see each config file's own comment for
 * exactly what is and isn't verified.
 *
 * The rest are listed (so the selector honestly reflects what NextCaseHQ
 * intends to cover) but marked 'coming-soon' rather than modeled with
 * guessed fields, since they run on separate, non-eCourts portals whose
 * real self-service search shape hasn't been verified yet.
 */
export const COURT_SYSTEMS: readonly CourtSystemConfig[] = [
  districtCourtsConfig,
  highCourtsConfig,
  supremeCourtConfig,
  consumerCommissionsConfig,
  { id: 'nclt', label: 'NCLT', status: 'coming-soon', steps: [] },
  { id: 'nclat', label: 'NCLAT', status: 'coming-soon', steps: [] },
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
