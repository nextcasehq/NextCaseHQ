import type { InterviewConfig } from './types';
import { WRIT_PETITION_INTERVIEW } from './schemas/writ-petition';

/**
 * The Legal Interview configuration layer's single extension point. A
 * future interview for any court vertical — Supreme Court SLPs, District
 * Court plaints, Magistrate Court complaints, tribunal filings, and so on
 * — is added by writing one schema file (see schemas/writ-petition.ts for
 * the pattern: an interview-engine `schema` plus scalarFields/listFields/
 * blockFields + an optional `metadata` object describing it) and adding it
 * here. Nothing else in the Document Creator changes: the interview engine
 * and the fill-template engine only ever read schema/scalarFields/
 * listFields/blockFields — `metadata` is carried but never inspected by
 * either, so any interview's descriptive metadata (or lack of it) has no
 * effect on how it renders or generates a draft today.
 */
const INTERVIEWS: InterviewConfig[] = [WRIT_PETITION_INTERVIEW];

const BY_TEMPLATE_ID: Record<string, InterviewConfig> = Object.fromEntries(INTERVIEWS.map((i) => [i.templateId, i]));

export function getInterviewConfigForTemplate(templateId: string): InterviewConfig | undefined {
  return BY_TEMPLATE_ID[templateId];
}
