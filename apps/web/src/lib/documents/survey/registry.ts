import type { InterviewConfig } from './types';
import { WRIT_PETITION_INTERVIEW } from './schemas/writ-petition';

/**
 * The Legal Interview Engine's single extension point. A future interview
 * for any court vertical — Supreme Court SLPs, District Court plaints,
 * Magistrate Court complaints, tribunal filings, and so on — is added by
 * writing one schema file (see schemas/writ-petition.ts for the pattern)
 * and adding it here. Nothing else in the Document Creator changes: the
 * wizard component, the fill-template engine, and the page that hosts
 * them are all driven entirely by whichever `InterviewConfig` a template
 * resolves to.
 */
const INTERVIEWS: InterviewConfig[] = [WRIT_PETITION_INTERVIEW];

const BY_TEMPLATE_ID: Record<string, InterviewConfig> = Object.fromEntries(INTERVIEWS.map((i) => [i.templateId, i]));

export function getInterviewConfigForTemplate(templateId: string): InterviewConfig | undefined {
  return BY_TEMPLATE_ID[templateId];
}
