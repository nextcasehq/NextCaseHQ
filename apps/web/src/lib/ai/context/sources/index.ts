import type { ContextSource } from '../types';
import { matterSummarySource } from './matter-summary-source';
import { proceedingsSource } from './proceedings-source';
import { participantsSource } from './participants-source';
import { chronologySource } from './chronology-source';

/**
 * Registration — a plain ordered array, not a dynamic plugin registry (no
 * need for that complexity yet). Future milestones (Documents, Evidence,
 * Drafts, AI Notes) add their own source here; nothing else in the context
 * pipeline changes.
 */
export const CONTEXT_SOURCES: ContextSource[] = [
  matterSummarySource,
  proceedingsSource,
  participantsSource,
  chronologySource,
];
