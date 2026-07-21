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
  status: 'HEARING',
  court: 'Demo Commercial Court',
  stage: 'Discovery',
  hearing_date: '2026-08-10',
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
