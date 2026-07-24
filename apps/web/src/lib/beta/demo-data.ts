/**
 * Two independent, deliberately separate synthetic-data mechanisms live in
 * this module — do not merge them:
 *
 * 1. `matchPublicPreviewRoute` — ALWAYS ON, never gated by any env var.
 *    Backs the small, explicitly-approved public-view allowlist (Legal
 *    Search, and the Matter dropdown that Document Creator/manual drafting
 *    needs to render) — see the "ARCHITECTURAL CORRECTION" to the
 *    "PRIORITY CHANGE — MAKE NEXTCASEHQ VIEWABLE BY PRODUCT OWNER"
 *    milestone. Security must not depend on a deployment remembering to
 *    set an env var, so these specific, narrow, read-only responses are
 *    unconditional.
 *
 *    One deliberate exception lives inside this "always on" function: the
 *    realistic, multi-Proceeding Case Diary dataset (getCaseDiaryDemoCases
 *    and its /api/cases/[id] sub-resource branches below) is individually
 *    gated on isProductReviewModeEnabled() at each call site, so a
 *    deployment that never sets PRODUCT_REVIEW_MODE keeps seeing exactly
 *    the original single-Proceeding fallback this branch always returned —
 *    the richer dataset only replaces it for an operator-initiated review
 *    session, never by default. Disable it the same way as the rest of
 *    Product Review Mode: unset PRODUCT_REVIEW_MODE (or set it to anything
 *    other than the exact string "true").
 *
 * 2. `matchProductReviewRoute` — Product Review Mode proper. Opt-in only
 *    (PRODUCT_REVIEW_MODE=true; secure-by-default, off otherwise), lets an
 *    operator additionally expose the Ask AI Action Card, AI Credits &
 *    Usage page, and the one fixed synthetic Matter Workspace
 *    (`DEMO_MATTER_ID`) sub-resources for manual review sessions. This is
 *    explicit configuration, never a global default.
 *
 * Both mechanisms only ever intercept GET requests with no session cookie
 * at all, and only this fixed, reserved set of paths; every write route
 * (POST/PATCH/PUT/DELETE) and every other GET is completely untouched and
 * falls through to the real, database-backed route unchanged. A real
 * signed-in session always reaches the real route too. Every payload
 * below is read-only, hand-written sample content — neither mechanism
 * ever touches the database client, issues SQL, or can resolve to a real
 * tenant id.
 */

import { findDemoSearchItem, searchDemoLegalDataset } from './demo-search-data';

export const DEMO_MATTER_ID = 'deadbeef-0000-4000-8000-000000000000';

// Opt-in, secure-by-default — must be explicitly set to "true" by an
// operator. Never globally enabled by default.
export function isProductReviewModeEnabled(): boolean {
  return process.env.PRODUCT_REVIEW_MODE === 'true';
}

const DEMO_MATTER = {
  id: DEMO_MATTER_ID,
  title: 'Demo Matter — Product Review (Sample Data)',
  matter_number: 'DEMO-0001',
  engagement_type: 'LITIGATION',
  practice_area: 'Commercial Litigation',
  status: 'ACTIVE',
  client_id: null,
  client_name: 'Acme Textiles Pvt. Ltd. (Demo)',
  opposing_party_name: 'R96 Global Traders (Demo)',
  opposing_counsel: 'Demo & Associates',
  court: 'Demo Commercial Court',
  bench: null,
  judge: null,
  description:
    'This is a read-only sample Matter shown for Product Review only. No real client, document, or case data is loaded — working with your own Matters is available after production activation.',
  opened_at: '2026-05-01T00:00:00.000Z',
  closed_at: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  is_demo: true,
};

const DEMO_HEALTH = {
  stage: 'Discovery',
  last_hearing_date: '2026-06-15',
  last_court_forum_display: 'Demo Commercial Court, Court 4',
  last_note: 'Sample court note for demonstration purposes.',
  last_case_title: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders',
  next_hearing_date: '2026-08-10',
  pending_action_count: 1,
  needs_attention: false,
};

const DEMO_PROCEEDING = {
  id: 'deadbeef-0000-4000-8000-000000000001',
  title: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders',
  case_number: 'DEMO-CS-001/2026',
  country_code: 'IN',
  status: 'HEARING',
  court: 'Demo Commercial Court',
  judge: null,
  stage: 'Discovery',
  hearing_date: '2026-08-10',
  notes: null,
  // The Case Diary bare list (matchPublicPreviewRoute's '/api/cases' branch
  // below) needs these Matter-linkage/daily-bucket fields too — the real
  // GET /api/cases route always returns them via LEFT JOIN, so this fixture
  // must carry the same shape or the unauthenticated Case Diary would
  // render differently from every authenticated one.
  matter_id: DEMO_MATTER_ID,
  updated_at: '2026-07-01T00:00:00.000Z',
  latest_hearing_outcome: null,
};

const DEMO_EVENT = {
  id: 'deadbeef-0000-4000-8000-000000000002',
  event_date: '2026-06-15T00:00:00.000Z',
  description: 'Sample timeline entry — initial hearing held, discovery schedule set.',
  source_type: 'MANUAL',
};

const DEMO_PARTICIPANT = {
  id: 'deadbeef-0000-4000-8000-000000000003',
  user_id: 'deadbeef-0000-4000-8000-000000000004',
  role: 'LEAD_COUNSEL',
  user_email: 'demo.counsel@nextcase.local',
  user_name: 'Demo Counsel',
};

const DEMO_COURT_NOTE = {
  id: 'deadbeef-0000-4000-8000-000000000005',
  case_id: DEMO_PROCEEDING.id,
  case_title: DEMO_PROCEEDING.title,
  hearing_date: '2026-06-15',
  next_hearing_date: '2026-08-10',
  court_forum_display: 'Demo Commercial Court, Court 4',
  stage: 'Discovery',
  note: 'Sample court note for demonstration purposes — not a real hearing record.',
  next_actions: 'Prepare discovery bundle ahead of the next hearing.',
};

const DEMO_TASK = {
  id: 'deadbeef-0000-4000-8000-000000000006',
  case_id: DEMO_PROCEEDING.id,
  case_title: DEMO_PROCEEDING.title,
  status: 'PENDING' as const,
  action_text: 'Prepare discovery bundle (sample action item)',
  hearing_date: '2026-08-10',
  court_forum_display: 'Demo Commercial Court, Court 4',
};

const DEMO_NOTIFICATION = {
  id: 'deadbeef-0000-4000-8000-000000000008',
  type: 'HEARING_REMINDER',
  title: 'Sample notification (Product Review)',
  message: 'This is a synthetic notification shown for Product Review only — not a real alert.',
  read_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
};

export const DEMO_DOCUMENT_ID = 'deadbeef-0000-4000-8000-000000000007';

const DEMO_DOCUMENT = {
  id: DEMO_DOCUMENT_ID,
  title: 'Sample Plaint (Demo Document)',
  document_type: 'PLAINT',
  version_count: 1,
  updated_at: '2026-06-01T00:00:00.000Z',
  created_at: '2026-06-01T00:00:00.000Z',
  matter_id: DEMO_MATTER_ID,
  case_id: null,
  // No storage_structure.content_type — this fixture has no real file
  // bytes behind it, so the Preview/Improve actions on the document detail
  // page correctly stay hidden (isPreviewEligible/isImproveEligible both
  // require a content_type) rather than offering a button that would fail.
  storage_structure: null,
  is_demo: true,
};

/**
 * Case Diary review dataset — a realistic multi-Proceeding litigation diary
 * for an unauthenticated reviewer, gated behind PRODUCT_REVIEW_MODE (see
 * the file-header exception note above). Every date is computed relative
 * to "now" at call time, never a hardcoded literal, so "Today's Hearings" /
 * "Adjourned Hearings" / "Completed Hearings" / "Upcoming Hearings" (the
 * Case Diary's own daily-bucket logic, apps/web/src/app/cases/page.tsx's
 * bucketFor) stay accurate no matter when the review session happens.
 * Seven Proceedings across seven different courts/forums, deliberately
 * covering every bucket the Case Diary can show plus one older, disposed
 * Proceeding that only surfaces through "All Proceedings" — the same
 * spread of stages and outcomes a genuinely active litigation practice
 * would show, not one lonely fixture.
 */
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function isoTimestamp(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(10, 30, 0, 0);
  return d.toISOString();
}

interface DemoCaseDiaryProceeding {
  id: string;
  title: string;
  case_number: string;
  country_code: 'IN';
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  court: string;
  judge: string | null;
  stage: string;
  hearing_date: string | null;
  notes: string | null;
  matter_id: null;
  matter_title: null;
  client_name: null;
  updated_at: string;
  latest_hearing_outcome: string | null;
}

function getCaseDiaryDemoCases(): DemoCaseDiaryProceeding[] {
  return [
    {
      id: 'deadbeef-0001-4000-8000-000000000001',
      title: 'State vs. Ramesh Yadav — Bail Application',
      case_number: 'BA-2201/2026',
      country_code: 'IN',
      status: 'HEARING',
      court: 'Sessions Court, Delhi',
      judge: 'Hon’ble Additional Sessions Judge',
      stage: 'Arguments on Bail',
      hearing_date: isoDate(0),
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(-6),
      latest_hearing_outcome: 'CONDUCTED',
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000002',
      title: 'Priya Nair vs. Nair — Divorce & Maintenance',
      case_number: 'MC-118/2025',
      country_code: 'IN',
      status: 'HEARING',
      court: 'Family Court, Bengaluru',
      judge: null,
      stage: 'Evidence',
      hearing_date: isoDate(14),
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(0),
      latest_hearing_outcome: 'ADJOURNED',
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000003',
      title: 'Orion Freight Carriers vs. Continental Shipping Co. — Commercial Suit',
      case_number: 'COMM-77/2024',
      country_code: 'IN',
      status: 'DISPOSED',
      court: 'Commercial Court, Mumbai',
      judge: null,
      stage: 'Judgment',
      hearing_date: null,
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(0),
      latest_hearing_outcome: 'JUDGMENT_PRONOUNCED',
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000004',
      title: 'Sunita Rathore vs. National Insurance Co. Ltd. — MACT Claim Petition',
      case_number: 'MACT-231/2025',
      country_code: 'IN',
      status: 'HEARING',
      court: 'Motor Accident Claims Tribunal, Nagpur',
      judge: null,
      stage: 'Cross-Examination',
      hearing_date: isoDate(5),
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(-20),
      latest_hearing_outcome: 'CONDUCTED',
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000005',
      title: 'Bharti Textile Mills vs. State of Maharashtra — Revision Petition',
      case_number: 'REV-58/2026',
      country_code: 'IN',
      status: 'PENDING',
      court: 'Revenue Court, Nashik',
      judge: null,
      stage: 'Admission',
      hearing_date: isoDate(21),
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(-45),
      latest_hearing_outcome: null,
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000006',
      title: 'Meera Krishnan vs. Union of India — Special Leave Petition',
      case_number: 'SLP(C)-9987/2026',
      country_code: 'IN',
      status: 'HEARING',
      court: 'Supreme Court of India',
      judge: null,
      stage: 'Notice Issued',
      hearing_date: isoDate(30),
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(-10),
      latest_hearing_outcome: 'CONDUCTED',
    },
    {
      id: 'deadbeef-0001-4000-8000-000000000007',
      title: 'State vs. Suresh Chandra — Cheque Dishonour Complaint',
      case_number: 'NI-Act-345/2025',
      country_code: 'IN',
      status: 'DISPOSED',
      court: 'Magistrate Court, Pune',
      judge: null,
      stage: 'Disposed',
      hearing_date: null,
      notes: null,
      matter_id: null,
      matter_title: null,
      client_name: null,
      updated_at: isoTimestamp(-60),
      latest_hearing_outcome: 'DISMISSED',
    },
  ];
}

/** Court Notes per demo Proceeding — one to two per case, giving each an
 * actual hearing history instead of an empty "no notes yet" state when
 * opened. Keyed by the Proceeding id above. */
function getCaseDiaryDemoCourtNotes(caseId: string) {
  const notesById: Record<string, unknown[]> = {
    'deadbeef-0001-4000-8000-000000000001': [
      {
        id: 'deadbeef-0002-4000-8000-000000000001',
        hearing_date: isoDate(-6),
        next_hearing_date: isoDate(0),
        court_forum_display: 'Sessions Court, Delhi',
        stage: 'Arguments on Bail',
        hearing_outcome: 'CONDUCTED',
        note: 'Bail application taken up. Prosecution sought time to file reply. Matter adjourned for arguments.',
        next_actions: 'Prepare rejoinder to prosecution’s reply before next hearing.',
        created_at: isoTimestamp(-6),
      },
    ],
    'deadbeef-0001-4000-8000-000000000002': [
      {
        id: 'deadbeef-0002-4000-8000-000000000002',
        hearing_date: isoDate(0),
        next_hearing_date: isoDate(14),
        court_forum_display: 'Family Court, Bengaluru',
        stage: 'Evidence',
        hearing_outcome: 'ADJOURNED',
        note: 'Respondent sought additional time to file evidence affidavit. Court granted one adjournment.',
        next_actions: 'File rejoinder affidavit before the next date.',
        created_at: isoTimestamp(0),
      },
      {
        id: 'deadbeef-0002-4000-8000-000000000009',
        hearing_date: isoDate(-30),
        next_hearing_date: isoDate(0),
        court_forum_display: 'Family Court, Bengaluru',
        stage: 'Evidence',
        hearing_outcome: 'CONDUCTED',
        note: 'Petitioner’s evidence recorded in part. Cross-examination to continue on next date.',
        next_actions: null,
        created_at: isoTimestamp(-30),
      },
    ],
    'deadbeef-0001-4000-8000-000000000003': [
      {
        id: 'deadbeef-0002-4000-8000-000000000003',
        hearing_date: isoDate(0),
        next_hearing_date: null,
        court_forum_display: 'Commercial Court, Mumbai',
        stage: 'Judgment',
        hearing_outcome: 'JUDGMENT_PRONOUNCED',
        note: 'Judgment pronounced in favour of the plaintiff. Damages of Rs. 18,50,000 awarded with interest.',
        next_actions: 'Apply for certified copy of judgment for execution proceedings.',
        created_at: isoTimestamp(0),
      },
    ],
    'deadbeef-0001-4000-8000-000000000004': [
      {
        id: 'deadbeef-0002-4000-8000-000000000004',
        hearing_date: isoDate(-20),
        next_hearing_date: isoDate(5),
        court_forum_display: 'Motor Accident Claims Tribunal, Nagpur',
        stage: 'Cross-Examination',
        hearing_outcome: 'CONDUCTED',
        note: 'Claimant’s cross-examination partly recorded. Insurer’s counsel to continue on next date.',
        next_actions: 'Summon treating doctor as next witness.',
        created_at: isoTimestamp(-20),
      },
    ],
    'deadbeef-0001-4000-8000-000000000006': [
      {
        id: 'deadbeef-0002-4000-8000-000000000006',
        hearing_date: isoDate(-10),
        next_hearing_date: isoDate(30),
        court_forum_display: 'Supreme Court of India',
        stage: 'Notice Issued',
        hearing_outcome: 'CONDUCTED',
        note: 'Notice issued to respondents. Matter listed for final hearing in eight weeks.',
        next_actions: 'Prepare compilation of documents for final hearing.',
        created_at: isoTimestamp(-10),
      },
    ],
    'deadbeef-0001-4000-8000-000000000007': [
      {
        id: 'deadbeef-0002-4000-8000-000000000007',
        hearing_date: isoDate(-60),
        next_hearing_date: null,
        court_forum_display: 'Magistrate Court, Pune',
        stage: 'Disposed',
        hearing_outcome: 'DISMISSED',
        note: 'Complaint dismissed for non-prosecution — complainant absent without justification.',
        next_actions: null,
        created_at: isoTimestamp(-60),
      },
    ],
  };
  return notesById[caseId];
}

/** Court Orders per demo Proceeding — only where a real order would exist
 * (a concluded/judgment-stage matter), matching the app's own rule that
 * Court Orders are certified-record entries, not every hearing note. */
function getCaseDiaryDemoOrders(caseId: string) {
  const ordersById: Record<string, unknown[]> = {
    'deadbeef-0001-4000-8000-000000000003': [
      {
        id: 'deadbeef-0003-4000-8000-000000000003',
        court_note_id: 'deadbeef-0002-4000-8000-000000000003',
        order_date: isoDate(0),
        summary: 'Judgment: suit decreed in favour of plaintiff for Rs. 18,50,000 with interest at 9% p.a. and costs.',
        document_id: null,
        certified_copy_required: true,
        certified_copy_status: 'PENDING',
      },
    ],
    'deadbeef-0001-4000-8000-000000000007': [
      {
        id: 'deadbeef-0003-4000-8000-000000000007',
        court_note_id: 'deadbeef-0002-4000-8000-000000000007',
        order_date: isoDate(-60),
        summary: 'Complaint dismissed for non-prosecution under Section 256 CrPC.',
        document_id: null,
        certified_copy_required: false,
        certified_copy_status: 'NOT_REQUIRED',
      },
    ],
  };
  return ordersById[caseId];
}

/**
 * ALWAYS ON — never gated by PRODUCT_REVIEW_MODE. The fixed, minimal set
 * of synthetic GET responses the approved public-view allowlist actually
 * needs to function:
 *  - /api/beta-status — lets a page swap "Authentication Required" wording
 *    for neutral, non-actionable wording instead of a sign-in wall.
 *  - /api/matters (list only) — Document Creator/manual drafting's Matter
 *    dropdown (/documents/new) would otherwise never leave its own
 *    "Authentication Required" wall (it treats a 401 here as "not
 *    viewable at all"), and the dashboard launch page's own Recent
 *    Matters card.
 *  - /api/search, /api/search/demo/* — the Legal Search interface.
 * Returns undefined for anything outside this fixed set — every other
 * path falls through unchanged (to the real route, or to the opt-in
 * matchProductReviewRoute below).
 */
export function matchPublicPreviewRoute(pathname: string, searchParams: URLSearchParams): unknown {
  if (pathname === '/api/beta-status') {
    return { enabled: true };
  }

  if (pathname === '/api/matters') {
    // Honor the same ?status= filter the real route supports — otherwise
    // the demo Matter (status ACTIVE) would incorrectly still appear
    // under every other status tab (ON_HOLD, CLOSED, ...) on /matters.
    const statusFilter = searchParams.get('status');
    const matchesFilter = !statusFilter || statusFilter === 'ALL' || statusFilter === DEMO_MATTER.status;
    return {
      matters: matchesFilter
        ? [
            {
              id: DEMO_MATTER.id,
              title: DEMO_MATTER.title,
              matter_number: DEMO_MATTER.matter_number,
              engagement_type: DEMO_MATTER.engagement_type,
              practice_area: DEMO_MATTER.practice_area,
              status: DEMO_MATTER.status,
              client_id: null,
              client_name: DEMO_MATTER.client_name,
              opposing_party_name: DEMO_MATTER.opposing_party_name,
              court: DEMO_MATTER.court,
              created_at: DEMO_MATTER.created_at,
              is_demo: true,
            },
          ]
        : [],
      total: matchesFilter ? 1 : 0,
      limit: 50,
      offset: 0,
      review_mode: true,
    };
  }

  // Case Diary (bare list, no matter_id filter) — without this, an
  // unauthenticated visit to /cases hits the real, database-backed
  // GET /api/cases, which always 401s for a request with no session
  // cookie, which in turn shows the "Preview Mode — Sign-In Unavailable"
  // wall (AuthOrReviewGate) even though beta-status above already told the
  // page Product Review Mode is active. Matching /api/matters below, this
  // lets an unauthenticated visitor see one real, correctly-shaped
  // Proceeding instead of a dead end. The matter-scoped case
  // (?matter_id=DEMO_MATTER_ID, used by the Matter Workspace's own case
  // list) stays with the opt-in matchProductReviewRoute below — only the
  // bare list is handled here.
  //
  // When PRODUCT_REVIEW_MODE is explicitly on, this branch instead serves
  // the fuller, realistic getCaseDiaryDemoCases() dataset (see above) so a
  // manual review session sees a genuine daily diary — every bucket
  // (today/adjourned/completed/upcoming), several courts, an older
  // disposed Proceeding — instead of one lonely fixture. A deployment that
  // never sets the flag keeps exactly the original single-Proceeding
  // fallback below, unchanged.
  if (pathname === '/api/cases' && !searchParams.get('matter_id')) {
    const statusFilter = searchParams.get('status');
    if (isProductReviewModeEnabled()) {
      const all = getCaseDiaryDemoCases();
      const matches = !statusFilter || statusFilter === 'ALL' ? all : all.filter((c) => c.status === statusFilter);
      return { cases: matches, total: matches.length, limit: 100, offset: 0, review_mode: true };
    }
    const matchesFilter = !statusFilter || statusFilter === 'ALL' || statusFilter === DEMO_PROCEEDING.status;
    return {
      cases: matchesFilter
        ? [
            {
              ...DEMO_PROCEEDING,
              matter_title: DEMO_MATTER.title,
              client_name: DEMO_MATTER.client_name,
            },
          ]
        : [],
      total: matchesFilter ? 1 : 0,
      limit: 50,
      offset: 0,
      review_mode: true,
    };
  }

  // Case Diary — single Proceeding detail + its Court Notes/Orders
  // sub-resources, opt-in (PRODUCT_REVIEW_MODE) only: without these, "Open
  // Proceeding" from the richer Case Diary list above would hit the real,
  // database-backed routes and 401, landing back on the Preview Mode wall
  // — exactly the dead end this whole dataset exists to avoid. Each only
  // matches an id that's actually in getCaseDiaryDemoCases(), so this is a
  // no-op (falls through, undefined) for any other id, including the
  // separate DEMO_PROCEEDING/DEMO_MATTER_ID fixture above.
  if (isProductReviewModeEnabled()) {
    const caseDetailMatch = pathname.match(/^\/api\/cases\/([0-9a-f-]{36})$/i);
    if (caseDetailMatch) {
      const found = getCaseDiaryDemoCases().find((c) => c.id === caseDetailMatch[1]);
      if (found) return { case: found };
    }

    const courtNotesMatch = pathname.match(/^\/api\/cases\/([0-9a-f-]{36})\/court-notes$/i);
    if (courtNotesMatch) {
      const notes = getCaseDiaryDemoCourtNotes(courtNotesMatch[1]);
      if (notes) return { court_notes: notes };
    }

    const ordersMatch = pathname.match(/^\/api\/cases\/([0-9a-f-]{36})\/orders$/i);
    if (ordersMatch) {
      const orders = getCaseDiaryDemoOrders(ordersMatch[1]);
      if (orders) return { orders };
    }
  }

  // Demo search — a separate, synthetic search path for the always-public
  // Legal Search interface. The real Search Service (lib/search/
  // search-service.ts) is completely unchanged and still requires a real
  // session for every request; this only ever answers GET /api/search when
  // there is no session cookie at all (the same condition every other
  // preview response uses).
  if (pathname === '/api/search') {
    const query = searchParams.get('q') ?? '';
    const matterId = searchParams.get('matter_id');
    if (matterId === DEMO_MATTER_ID) {
      // Matter-scoped ("Search this Matter") — reuses the same demo
      // Proceeding / Document / Court Note fixtures shown in the
      // (opt-in-only) demo Matter Workspace, not the general legal
      // dataset below.
      const q = query.trim().toLowerCase();
      const proceedingMatches = q && DEMO_PROCEEDING.title.toLowerCase().includes(q);
      const documentMatches = q && DEMO_DOCUMENT.title.toLowerCase().includes(q);
      const courtNoteMatches = q && DEMO_COURT_NOTE.note.toLowerCase().includes(q);
      return {
        query,
        review_mode: true,
        groups: [
          {
            type: 'PROCEEDING',
            providerName: 'DemoProceedingProvider',
            items: proceedingMatches
              ? [{ id: DEMO_PROCEEDING.id, title: DEMO_PROCEEDING.title, snippet: `${DEMO_PROCEEDING.case_number} · ${DEMO_PROCEEDING.court}`, score: 1, href: `/cases/${DEMO_PROCEEDING.id}`, is_demo: true }]
              : [],
          },
          {
            type: 'DOCUMENT',
            providerName: 'DemoDocumentProvider',
            items: documentMatches
              ? [{ id: DEMO_DOCUMENT.id, title: DEMO_DOCUMENT.title, snippet: 'PLAINT · v1', score: 1, href: `/documents/${DEMO_DOCUMENT.id}`, is_demo: true }]
              : [],
          },
          {
            type: 'COURT_NOTE',
            providerName: 'DemoCourtNoteProvider',
            items: courtNoteMatches
              ? [{ id: DEMO_COURT_NOTE.id, title: DEMO_COURT_NOTE.case_title, snippet: DEMO_COURT_NOTE.note, score: 1, href: '', is_demo: true }]
              : [],
          },
        ],
      };
    }
    // General legal-research search (landing page, dashboard, or /search
    // with no matter_id) — the small synthetic Judgments / Acts /
    // Sections / Citations dataset, plus the same demo Document reused
    // above so "Documents" appears here too.
    const q = query.trim().toLowerCase();
    const documentMatches = q && DEMO_DOCUMENT.title.toLowerCase().includes(q);
    return {
      query,
      review_mode: true,
      groups: [
        ...searchDemoLegalDataset(query),
        {
          type: 'DOCUMENT',
          providerName: 'DemoDocumentProvider',
          items: documentMatches
            ? [{ id: DEMO_DOCUMENT.id, title: DEMO_DOCUMENT.title, snippet: 'PLAINT · v1', score: 1, href: `/documents/${DEMO_DOCUMENT.id}`, is_demo: true }]
            : [],
        },
      ],
    };
  }

  if (pathname.startsWith('/api/search/demo/')) {
    const id = pathname.slice('/api/search/demo/'.length);
    const item = findDemoSearchItem(id);
    return item ? { result: item } : undefined;
  }

  return undefined;
}

/**
 * Opt-in only (PRODUCT_REVIEW_MODE=true) — the broader legacy Product
 * Review Mode surface: the Ask AI Action Card, the AI Credits & Usage
 * page, and the one fixed synthetic Matter Workspace's (`DEMO_MATTER_ID`)
 * sub-resources. Never active by default; an operator must explicitly
 * turn this on for a manual review session. Returns undefined for
 * anything outside this fixed, reserved set — every other path falls
 * through to the real route unchanged.
 */
export function matchProductReviewRoute(
  pathname: string,
  searchParams: URLSearchParams
): unknown {
  if (pathname === '/api/notifications') {
    return { notifications: [DEMO_NOTIFICATION], unread_count: 1, review_mode: true };
  }

  if (pathname === `/api/matters/${DEMO_MATTER_ID}`) {
    return { matter: DEMO_MATTER };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/participants`) {
    return { participants: [DEMO_PARTICIPANT] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/proceedings`) {
    return { proceedings: [DEMO_PROCEEDING] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/court-notes`) {
    return { court_notes: [DEMO_COURT_NOTE] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/events`) {
    return { events: [DEMO_EVENT] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/tasks`) {
    return { tasks: [DEMO_TASK] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/health`) {
    return { health: DEMO_HEALTH };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/preparation`) {
    return { preparation: [] };
  }
  if (pathname === '/api/cases' && searchParams.get('matter_id') === DEMO_MATTER_ID) {
    return { cases: [DEMO_PROCEEDING] };
  }
  if (pathname === '/api/documents' && searchParams.get('matter_id') === DEMO_MATTER_ID) {
    return { documents: [DEMO_DOCUMENT] };
  }
  if (pathname === `/api/documents/${DEMO_DOCUMENT_ID}`) {
    return { document: DEMO_DOCUMENT };
  }

  return undefined;
}
