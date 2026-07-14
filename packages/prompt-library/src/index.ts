/**
 * NCHQ Module: Prompt & Templates Library
 */

export interface LegalTemplate {
  id: string;
  title: string;
  jurisdiction: string;
  structure: string;
  boilerplate: string;
}

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    id: "TEMP-NOTICE",
    title: "15-Day Demand Notice under Section 138, NI Act",
    jurisdiction: "India (IN)",
    structure: "Date, Addresses, Cheque Details, Reason for Return, Demand Clause",
    boilerplate: `IN THE CHAMBERS OF SENIOR ADVOCATE

LEGAL DEMAND NOTICE

Date: [DATE]

TO,
[OPPOSING_PARTY_NAME]
[OPPOSING_PARTY_ADDRESS]

SUBJECT: DEMAND NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOR OF CHEQUE NO. [CHEQUE_NO]

Dear Sir/Madam,

Under instructions from our client, we hereby serve you with the following demand notice:

1. Our client holds an active ledger account with you. Towards partial discharge of your legally enforceable debt, you issued Cheque No. [CHEQUE_NO] dated [CHEQUE_DATE] for an amount of INR [AMOUNT] drawn on [BANK_NAME].

2. The said cheque was presented for clearance on [PRESENTATION_DATE]. However, it was dishonored and returned by the bank on [RETURN_DATE] with the endorsement: "Insufficiency of Funds".

3. We hereby demand that you pay the sum of INR [AMOUNT] within fifteen (15) days of the receipt of this notice. Failure to comply will result in immediate criminal prosecution.

Sincerely,
Counsel for Claimant
NextCaseHQ secure cryptographic signature: [TENANT_HMAC]`
  },
  {
    id: "TEMP-WRIT",
    title: "Writ Petition under Article 226 of the Constitution of India",
    jurisdiction: "India (IN) - High Court",
    structure: "Format, Parties, Facts, Grounds, Urgency, Interim Prayers",
    boilerplate: `IN THE HIGH COURT OF DELHI AT NEW DELHI

WRIT PETITION (CIVIL) NO. 132 OF 2026

IN THE MATTER OF:
NEXTCASEHQ TECHNOLOGIES INC.                     ... PETITIONER

VERSUS

UNION OF INDIA & ANR.                           ... RESPONDENTS

PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA

TO,
THE HON'BLE CHIEF JUSTICE AND HIS COMPANION JUDGES OF THE HIGH COURT OF DELHI

THE HUMBLE PETITION OF THE PETITIONER ABOVE-NAMED

MOST RESPECTFULLY SHOWETH:

1. The Petitioner is a registered legal-technology enterprise pioneering zero-knowledge secure cryptographic litigation services.

2. Factual Matrix: Opposing parties are seeking to disrupt cryptographic session parameters and active CloudKMS circuit-breakers without authorized judicial warrants.

3. Grounds of Petition:
   - A. The right to data sovereignty is protected under Section 43A of the IT Act.
   - B. The actions of the Respondents create an immediate threat of data leakage.

PRAYERS:
In light of the above facts, the Petitioner respectfully prays for interim relief to protect CloudKMS session keys.

PETITIONER
THROUGH COUNSEL`
  }
];

export async function getPrompt(token: string) {
  if (token === "NOTICE") {
    return LEGAL_TEMPLATES.find(t => t.id === "TEMP-NOTICE")?.boilerplate || "";
  }
  if (token === "WRIT") {
    return LEGAL_TEMPLATES.find(t => t.id === "TEMP-WRIT")?.boilerplate || "";
  }
  return `Prompt for ${token}`;
}
