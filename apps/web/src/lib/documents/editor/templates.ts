import type { PageSetup } from './page-setup';
import { DEFAULT_PAGE_SETUP } from './page-setup';
import { WRIT_PETITION_TEMPLATE_HTML } from '../survey/schemas/writ-petition';

/**
 * Master legal document templates — Indian jurisdiction primary. These
 * HTML strings are the immutable master content: selecting a template
 * never edits this module's exports, it only seeds a brand-new,
 * independent draft (a fresh DocumentDraft row / local-only draft) whose
 * content the advocate is then free to edit without limit. See
 * page.tsx's handleSelectTemplate, which always creates a new draft
 * rather than mutating one in place.
 */

/**
 * The five primary Court Verticals templates and matters are organised
 * under, per the UI/UX Specification's Appendix A ("Template Library and
 * Court Organisation"). This taxonomy is shared with the Matter Register
 * (Appendix A.6) so the same five names are used consistently across the
 * application — it is deliberately fixed and small rather than an
 * arbitrary free-text field.
 */
export type CourtVertical = 'SUPREME_COURT' | 'HIGH_COURTS' | 'DISTRICT_COURTS' | 'MAGISTRATE_COURTS' | 'OTHER_COURTS_TRIBUNALS';

export const COURT_VERTICALS: { id: CourtVertical; label: string }[] = [
  { id: 'SUPREME_COURT', label: 'Supreme Court' },
  { id: 'HIGH_COURTS', label: 'High Courts' },
  { id: 'DISTRICT_COURTS', label: 'District Courts' },
  { id: 'MAGISTRATE_COURTS', label: 'Magistrate Courts' },
  { id: 'OTHER_COURTS_TRIBUNALS', label: 'Other Courts & Tribunals' },
];

export interface LegalTemplate {
  id: string;
  name: string;
  jurisdiction: 'IN';
  courtVertical: CourtVertical;
  /** e.g. "Delhi High Court" — the specific court, where applicable. */
  court: string;
  /** e.g. "Constitutional", "Civil" — Appendix A.3's card field. */
  practiceArea: string;
  documentType: string;
  version: string;
  isStarterTemplate: boolean;
  defaultFontFamily: string;
  pageSetup: PageSetup;
  html: string;
}

const SIGNATURE_BLOCK = `
<p style="text-align: right">[ADVOCATE NAME]<br/>Counsel for the Petitioner</p>
`;

export const DELHI_HC_WRIT_PETITION: LegalTemplate = {
  id: 'in-delhi-hc-writ-petition',
  name: 'Delhi High Court Writ Petition',
  jurisdiction: 'IN',
  courtVertical: 'HIGH_COURTS',
  court: 'Delhi High Court',
  practiceArea: 'Constitutional',
  documentType: 'PETITION',
  version: 'v1.0',
  isStarterTemplate: true,
  defaultFontFamily: 'Times New Roman',
  pageSetup: { ...DEFAULT_PAGE_SETUP, header: 'IN THE HIGH COURT OF DELHI AT NEW DELHI' },
  html: `
<h2 style="text-align: center">IN THE HIGH COURT OF DELHI AT NEW DELHI</h2>
<p style="text-align: center">(EXTRAORDINARY WRIT JURISDICTION)</p>
<p style="text-align: center"><strong>W.P.(C) No. [CASE NUMBER] of [YEAR]</strong></p>
<p>&nbsp;</p>
<p><strong>IN THE MATTER OF:</strong></p>
<p>[PETITIONER NAME]<br/>... Petitioner</p>
<p style="text-align: center">VERSUS</p>
<p>[RESPONDENT NAME] &amp; Ors.<br/>... Respondents</p>
<p>&nbsp;</p>
<h3 style="text-align: center">PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA</h3>
<p>To,<br/>The Hon'ble Chief Justice and His Companion Justices of the High Court of Delhi at New Delhi.</p>
<p><strong>THE HUMBLE PETITION OF THE PETITIONER ABOVE NAMED</strong></p>
<p style="text-align: center"><strong>MOST RESPECTFULLY SHOWETH:</strong></p>
<ol>
  <li>That the Petitioner is filing the present writ petition invoking the extraordinary jurisdiction of this Hon'ble Court under Article 226 of the Constitution of India, [FACTS].</li>
  <li>That the cause of action for filing the present petition arose on [DATES], within the territorial jurisdiction of this Hon'ble Court.</li>
  <li>That the Petitioner has not filed any other petition seeking the same or substantially the same relief before this Hon'ble Court or any other Court.</li>
</ol>
<h3>GROUNDS</h3>
<p>[GROUNDS], and in particular on the following amongst other grounds, each of which is taken in the alternative without prejudice to one another:</p>
<ol>
  <li>Because [LEGAL PROVISIONS] mandates the relief sought herein.</li>
  <li>Because the impugned action is arbitrary, illegal, and violative of Articles 14 and 21 of the Constitution of India.</li>
</ol>
<h3>PRAYER</h3>
<p>In view of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:</p>
<ol>
  <li>Issue an appropriate writ, order or direction, [RELIEF SOUGHT];</li>
  <li>Pass any other order(s) as this Hon'ble Court may deem fit and proper in the facts and circumstances of the case.</li>
</ol>
<p>AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL AS IN DUTY BOUND EVER PRAY.</p>
<div data-page-break="true"></div>
<h3>VERIFICATION</h3>
<p>Verified at [PLACE] on this [DATE] that the contents of the above petition are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.</p>
<p><strong>Place:</strong> [PLACE]<br/><strong>Date:</strong> [DATE]</p>
${SIGNATURE_BLOCK}
`.trim(),
};

export const CIVIL_SUIT_PLAINT: LegalTemplate = {
  id: 'in-civil-suit-plaint',
  name: 'Civil Suit / Plaint',
  jurisdiction: 'IN',
  courtVertical: 'DISTRICT_COURTS',
  court: 'District Court',
  practiceArea: 'Civil',
  documentType: 'PLAINT',
  version: 'v1.0',
  isStarterTemplate: true,
  defaultFontFamily: 'Times New Roman',
  pageSetup: { ...DEFAULT_PAGE_SETUP, header: 'IN THE COURT OF [COURT NAME]' },
  html: `
<h2 style="text-align: center">IN THE COURT OF [COURT NAME]</h2>
<p style="text-align: center">AT [JURISDICTION]</p>
<p style="text-align: center"><strong>C.S. No. [CASE NUMBER] of [YEAR]</strong></p>
<p>&nbsp;</p>
<p><strong>IN THE MATTER OF:</strong></p>
<p>[PLAINTIFF NAME]<br/>... Plaintiff</p>
<p style="text-align: center">VERSUS</p>
<p>[DEFENDANT NAME]<br/>... Defendant</p>
<p>&nbsp;</p>
<h3 style="text-align: center">PLAINT</h3>
<p>The Plaintiff above named most respectfully submits as follows:</p>
<h3>FACTS</h3>
<ol>
  <li>That the Plaintiff is [FACTS].</li>
  <li>That the Defendant is liable to the Plaintiff on account of the following chronology of events: [DATES].</li>
  <li>That the cause of action for the present suit arose on [DATES] and continues to subsist, within the territorial jurisdiction of this Hon'ble Court.</li>
</ol>
<h3>GROUNDS</h3>
<p>[GROUNDS], the Defendant is liable under [LEGAL PROVISIONS].</p>
<h3>PRAYER</h3>
<p>It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:</p>
<ol>
  <li>Decree the suit in favour of the Plaintiff and against the Defendant for [RELIEF SOUGHT];</li>
  <li>Award costs of the suit;</li>
  <li>Pass any other order(s) as this Hon'ble Court may deem fit and proper.</li>
</ol>
<div data-page-break="true"></div>
<h3>VERIFICATION</h3>
<p>Verified at [PLACE] on this [DATE] that the contents of paragraphs above are true to my knowledge and belief and nothing material has been concealed therefrom.</p>
<p><strong>Place:</strong> [PLACE]<br/><strong>Date:</strong> [DATE]</p>
${SIGNATURE_BLOCK}
`.trim(),
};

export const AFFIDAVIT: LegalTemplate = {
  id: 'in-affidavit',
  name: 'Affidavit',
  jurisdiction: 'IN',
  courtVertical: 'DISTRICT_COURTS',
  court: 'District Court',
  practiceArea: 'Civil',
  documentType: 'AFFIDAVIT',
  version: 'v1.0',
  isStarterTemplate: true,
  defaultFontFamily: 'Times New Roman',
  pageSetup: { ...DEFAULT_PAGE_SETUP, header: 'IN THE COURT OF [COURT NAME]' },
  html: `
<h2 style="text-align: center">IN THE COURT OF [COURT NAME]</h2>
<p style="text-align: center">AT [JURISDICTION]</p>
<p style="text-align: center"><strong>[CASE NUMBER] of [YEAR]</strong></p>
<p>&nbsp;</p>
<p><strong>IN THE MATTER OF:</strong></p>
<p>[PETITIONER NAME]<br/>... Petitioner/Plaintiff</p>
<p style="text-align: center">VERSUS</p>
<p>[RESPONDENT NAME]<br/>... Respondent/Defendant</p>
<p>&nbsp;</p>
<h3 style="text-align: center">AFFIDAVIT</h3>
<p>I, [PETITIONER NAME], son/daughter of ____________, aged about ____ years, residing at ____________, do hereby solemnly affirm and declare as under:</p>
<ol>
  <li>That I am the Petitioner/Plaintiff in the above-captioned matter and am well conversant with the facts and circumstances of the case, and am competent to swear this affidavit.</li>
  <li>That [FACTS].</li>
  <li>That the annexures filed along with the accompanying application are true copies of their respective originals.</li>
</ol>
<h3>VERIFICATION</h3>
<p>Verified at [PLACE] on this [DATE] that the contents of the above affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.</p>
<p><strong>Place:</strong> [PLACE]<br/><strong>Date:</strong> [DATE]</p>
<p style="text-align: right">DEPONENT</p>
`.trim(),
};

/**
 * Guided-interview reference template: a generic High Court Writ
 * Petition. Unlike the three static templates above, this one's content
 * isn't loaded directly — selecting it opens the Legal Interview Engine's
 * wizard (see lib/documents/survey/), and the draft is generated from the
 * advocate's answers via simple placeholder substitution into this same
 * master HTML (lib/documents/survey/schemas/writ-petition.ts). No state
 * or specific High Court is hardcoded — the court name is an interview
 * answer — so this one template represents any High Court writ petition.
 */
export const HIGH_COURT_WRIT_PETITION_GUIDED: LegalTemplate = {
  id: 'in-high-court-writ-petition-guided',
  name: 'Writ Petition (Guided Interview)',
  jurisdiction: 'IN',
  courtVertical: 'HIGH_COURTS',
  court: 'High Court (as specified in interview)',
  practiceArea: 'Constitutional',
  documentType: 'PETITION',
  version: 'v1.0',
  isStarterTemplate: true,
  defaultFontFamily: 'Times New Roman',
  pageSetup: DEFAULT_PAGE_SETUP,
  html: WRIT_PETITION_TEMPLATE_HTML,
};

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  DELHI_HC_WRIT_PETITION,
  CIVIL_SUIT_PLAINT,
  AFFIDAVIT,
  HIGH_COURT_WRIT_PETITION_GUIDED,
];

export function getTemplateById(id: string): LegalTemplate | undefined {
  return LEGAL_TEMPLATES.find((t) => t.id === id);
}

export const BLANK_DRAFT_TITLE = 'Untitled Draft';
