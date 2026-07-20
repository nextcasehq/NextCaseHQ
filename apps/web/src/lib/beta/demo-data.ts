/**
 * Beta Preview — a temporary, environment-flagged mode that lets an
 * unauthenticated visitor see a working `/dashboard` launch page and one
 * fixed, entirely synthetic Matter Workspace (`DEMO_MATTER_ID`) without
 * ever touching the database or weakening authorization for any real
 * tenant's data.
 *
 * Disabled by default. Enable with BETA_PREVIEW_ENABLED=true. This is a
 * server-only flag (read in middleware.ts) — there is no client-exposed
 * equivalent; the client infers demo mode purely from the `is_demo` /
 * `beta_preview` markers already present in the JSON these routes return,
 * so there is nothing to keep in sync.
 *
 * Every payload below is read-only, hand-written sample content. No write
 * route (POST/PATCH/PUT/DELETE) is ever short-circuited here — only GET
 * requests to this fixed set of paths, and only when there is no session
 * cookie at all. A real signed-in session always reaches the real,
 * database-backed route unchanged.
 */

export const DEMO_MATTER_ID = 'deadbeef-0000-4000-8000-000000000000';

export function isBetaPreviewEnabled(): boolean {
  return process.env.BETA_PREVIEW_ENABLED === 'true';
}

const DEMO_MATTER = {
  id: DEMO_MATTER_ID,
  title: 'Demo Matter — Beta Preview (Sample Data)',
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
    'This is a read-only sample Matter shown for Beta Preview only. No real client, document, or case data is loaded — working with your own Matters is available after beta.',
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

const DEMO_DOCUMENT = {
  id: 'deadbeef-0000-4000-8000-000000000007',
  title: 'Sample Plaint (Demo Document)',
  document_type: 'PLAINT',
  version_count: 1,
  updated_at: '2026-06-01T00:00:00.000Z',
};

/**
 * Maps a request's pathname (+ query, for the matter_id-filtered routes)
 * to a static demo payload. Returns undefined for anything outside this
 * fixed, reserved set — every other path falls through to the real route
 * unchanged.
 */
export function matchBetaPreviewRoute(
  pathname: string,
  searchParams: URLSearchParams
): unknown {
  // Lets an unauthenticated page know whether Beta Preview is actually
  // active — e.g. to swap "Authentication Required" wording for neutral
  // "Available after beta" wording on a real (non-demo) Matter ID. No real
  // route backs this path; it only ever answers from here, and only for
  // the same no-session GET case every other Beta Preview response uses.
  if (pathname === '/api/beta-status') {
    return { enabled: true };
  }

  if (pathname === '/api/matters') {
    return {
      matters: [
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
      ],
      total: 1,
      limit: 50,
      offset: 0,
      beta_preview: true,
    };
  }

  if (pathname === '/api/notifications') {
    return { notifications: [], unread_count: 0, beta_preview: true };
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

  return undefined;
}
