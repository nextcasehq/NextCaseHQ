'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import BrandBackground from '@/components/BrandBackground';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES, type MatterStatus, type MatterEngagementType } from '@/lib/domain/matter';
import { getDocumentType } from '@/lib/domain/document-type';
import MatterClosurePanel from './MatterClosurePanel';

interface Matter {
  id: string;
  title: string;
  matter_number: string | null;
  engagement_type: MatterEngagementType;
  practice_area: string | null;
  status: MatterStatus;
  client_id: string | null;
  client_name: string | null;
  opposing_party_name: string | null;
  opposing_counsel: string | null;
  court: string | null;
  bench: string | null;
  judge: string | null;
  description: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Set only by the Product Review demo payload — never by a real Matter. */
  is_demo?: boolean;
}

interface Proceeding {
  id: string;
  title: string;
  case_number: string | null;
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  court: string | null;
  stage: string | null;
  hearing_date: string | null;
}

interface MatterEvent {
  id: string;
  event_date: string;
  description: string;
  source_type: string;
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
  user_email: string;
  user_name: string | null;
}

interface MatterCourtNote {
  id: string;
  case_id: string;
  case_title: string;
  hearing_date: string;
  next_hearing_date: string | null;
  court_forum_display: string;
  stage: string;
  note: string;
  next_actions: string | null;
}

interface MatterTaskItem {
  id: string;
  case_id: string;
  case_title: string;
  status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
  action_text: string | null;
  hearing_date: string;
  court_forum_display: string;
}

interface MatterHealth {
  stage: string | null;
  last_hearing_date: string | null;
  last_court_forum_display: string | null;
  last_note: string | null;
  last_case_title: string | null;
  next_hearing_date: string | null;
  pending_action_count: number;
  needs_attention: boolean;
}

interface PreparationPendingAction {
  id: string;
  action_text: string | null;
}

interface PreparationDocument {
  id: string;
  title: string;
}

interface MatterDocument {
  id: string;
  title: string;
  document_type: string | null;
  version_count: number;
  updated_at: string;
}

interface PreparationItem {
  case_id: string;
  case_title: string;
  hearing_date: string;
  stage: string | null;
  court_forum_display: string | null;
  last_note: string | null;
  pending_actions: PreparationPendingAction[];
  documents: PreparationDocument[];
}

/**
 * Honest placeholder for a future sub-milestone's real data — never
 * fabricated content (Milestone 1 condition: empty states must be honest).
 */
function ComingSoonPanel({ title, description, id }: { title: string; description: string; id?: string }) {
  return (
    <div id={id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-3">{title}</h2>
      <div className="text-center py-8 bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl">
        <p className="text-xs font-semibold text-[#6F5624]">Not yet available.</p>
        <p className="text-[10px] text-[#726B58] mt-1 max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  );
}

export default function MatterDetailsChamberPage() {
  const params = useParams();
  const id = params.id as string;

  const [matter, setMatter] = useState<Matter | null | undefined>(undefined);
  const [proceedings, setProceedings] = useState<Proceeding[]>([]);
  const [events, setEvents] = useState<MatterEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matterCourtNotes, setMatterCourtNotes] = useState<MatterCourtNote[]>([]);
  const [matterTasks, setMatterTasks] = useState<MatterTaskItem[]>([]);
  const [health, setHealth] = useState<MatterHealth | null>(null);
  const [preparationItems, setPreparationItems] = useState<PreparationItem[]>([]);
  const [matterDocuments, setMatterDocuments] = useState<MatterDocument[]>([]);
  const [showFullCourtNoteHistory, setShowFullCourtNoteHistory] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [showUnavailablePrompt, setShowUnavailablePrompt] = useState(false);
  // Only ever set true by a successful, unauthenticated GET /api/beta-status
  // — i.e. Product Review Mode is actually active right now. Governs
  // whether the "Authentication Required" wall below uses neutral review
  // wording instead of the normal sign-in wording; when review mode is off
  // this never becomes true and the wall is unchanged.
  const [reviewModeActive, setReviewModeActive] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<MatterStatus>('ACTIVE');
  const [editDescription, setEditDescription] = useState('');

  const [showProceedingForm, setShowProceedingForm] = useState(false);
  const [proceedingTitle, setProceedingTitle] = useState('');
  const [proceedingCountryCode, setProceedingCountryCode] = useState('IN');
  const [proceedingCourt, setProceedingCourt] = useState('');

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const fetchMatter = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}`);
    if (res.status === 401) {
      setNeedsAuth(true);
      fetch('/api/beta-status')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.enabled) setReviewModeActive(true);
        })
        .catch(() => {});
      return;
    }
    if (!res.ok) {
      setMatter(null);
      return;
    }
    const data = await res.json();
    setMatter(data.matter);
    setEditTitle(data.matter.title);
    setEditStatus(data.matter.status);
    setEditDescription(data.matter.description ?? '');
  }, [id]);

  const fetchProceedings = useCallback(async () => {
    const res = await fetch(`/api/cases?matter_id=${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProceedings(data.cases);
  }, [id]);

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/events`);
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data.events);
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/participants`);
    if (!res.ok) return;
    const data = await res.json();
    setParticipants(data.participants);
  }, [id]);

  const fetchMatterCourtNotes = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/court-notes`);
    if (!res.ok) return;
    const data = await res.json();
    setMatterCourtNotes(data.court_notes);
  }, [id]);

  const fetchMatterTasks = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/tasks`);
    if (!res.ok) return;
    const data = await res.json();
    setMatterTasks(data.tasks);
  }, [id]);

  const fetchHealth = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/health`);
    if (!res.ok) return;
    const data = await res.json();
    setHealth(data.health);
  }, [id]);

  const fetchPreparation = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/preparation`);
    if (!res.ok) return;
    const data = await res.json();
    setPreparationItems(data.preparation);
  }, [id]);

  const fetchMatterDocuments = useCallback(async () => {
    const res = await fetch(`/api/documents?matter_id=${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMatterDocuments(data.documents);
  }, [id]);

  const handleTaskStatusChange = async (taskId: string, status: 'COMPLETED' | 'DISMISSED' | 'PENDING') => {
    if (matter?.is_demo) {
      setShowUnavailablePrompt(true);
      return;
    }
    const res = await fetch(`/api/matters/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchMatterTasks();
      fetchHealth();
    }
  };

  useEffect(() => {
    fetchMatter();
    fetchProceedings();
    fetchEvents();
    fetchParticipants();
    fetchMatterCourtNotes();
    fetchMatterTasks();
    fetchHealth();
    fetchPreparation();
    fetchMatterDocuments();
  }, [
    fetchMatter,
    fetchProceedings,
    fetchEvents,
    fetchParticipants,
    fetchMatterCourtNotes,
    fetchMatterTasks,
    fetchHealth,
    fetchPreparation,
    fetchMatterDocuments,
  ]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Product Review Mode is read-only — the Edit Matter form itself stays
    // fully explorable, but the actual write is guarded here at submit
    // time instead of blocking the form from opening at all.
    if (matter?.is_demo) {
      setShowUnavailablePrompt(true);
      return;
    }
    const res = await fetch(`/api/matters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, status: editStatus, description: editDescription }),
    });
    if (!res.ok) return;
    setIsEditing(false);
    fetchMatter();
  };

  const handleCreateProceeding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proceedingTitle) return;
    if (matter?.is_demo) {
      setShowUnavailablePrompt(true);
      return;
    }
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: proceedingTitle,
        country_code: proceedingCountryCode,
        court: proceedingCourt || undefined,
        matter_id: id,
      }),
    });
    if (!res.ok) return;
    setProceedingTitle('');
    setProceedingCourt('');
    setShowProceedingForm(false);
    fetchProceedings();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !eventDescription) return;
    if (matter?.is_demo) {
      setShowUnavailablePrompt(true);
      return;
    }
    const res = await fetch(`/api/matters/${id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_date: eventDate, description: eventDescription }),
    });
    if (!res.ok) return;
    setEventDate('');
    setEventDescription('');
    setShowEventForm(false);
    fetchEvents();
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20 text-center">
          {reviewModeActive ? (
            <>
              <span className="text-3xl">👁️</span>
              <h3 className="text-base font-bold text-[#4A4130] mt-3">Not Available</h3>
              <p className="text-xs text-[#726B58] mt-1 max-w-sm mx-auto">Function available after production activation.</p>
            </>
          ) : (
            <>
              <span className="text-3xl">🔒</span>
              <h3 className="text-base font-bold text-[#4A4130] mt-3">Authentication Required</h3>
              <p className="text-xs text-[#726B58] mt-1 max-w-sm mx-auto">Sign in to view this matter.</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F]">
                Phone verification is required to save or access private work.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (matter === null) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20">
        <span className="text-3xl">⚠️</span>
        <h2 className="text-lg font-bold mt-2">Matter Not Found</h2>
        <p className="text-xs text-[#726B58] mt-1">This matter does not exist or you don&apos;t have access to it.</p>
        <Link href="/matters" className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
          Back to Matters
        </Link>
      </div>
    );
  }

  if (matter === undefined) {
    return (
      <div className="flex flex-1 justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  // Product Review's demo Matter is read-only, but every form (Edit
  // Matter, Add Proceeding, Add Timeline Entry) still opens for full UX
  // inspection — only the actual submit is guarded (see handleUpdate,
  // handleCreateProceeding, handleCreateEvent, handleTaskStatusChange
  // above), so reviewers see the whole form, not just a blocked button.

  return (
    <div className="relative isolate max-w-6xl w-full mx-auto px-6 pb-10">
      <BrandBackground />
        {/* Matter Title Card — "Overview" anchor target for the Matter
            Navigator. The old in-page "Back to Matters" and "Search this
            Matter" links are retired here: both are now provided by the
            shell (matters/layout.tsx's Matter Navigator and Command
            Center search bar respectively) — keeping them here too would
            be duplicate navigation, against the Zero-Clutter Rule. */}
        <div id="matter-overview" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                {matter.matter_number || matter.id.slice(0, 8)}
              </span>
              <span className="text-[10px] font-bold text-[#726B58] border border-[#E7DFC9] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                {matter.engagement_type.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                matter.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                matter.status === 'ON_HOLD' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                matter.status === 'CLOSED' ? 'bg-[#F4EEE0] text-[#5C5340] border border-[#E7DFC9]' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {matter.status}
              </span>
              {health?.needs_attention && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  NEEDS ATTENTION
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">
              {matter.title}
            </h1>
            <p className="text-xs text-[#726B58] font-bold uppercase tracking-wider">
              CLIENT: <span className="text-[#5C5340] font-sans">{matter.client_name || 'Not yet linked'}</span>
              {matter.court && <> · COURT: <span className="text-[#5C5340] font-sans">{matter.court}</span></>}
            </p>
            {health && (health.stage || health.next_hearing_date) && (
              <p className="text-xs text-[#726B58] font-bold uppercase tracking-wider">
                {health.stage && <>STAGE: <span className="text-[#8A6D2F] font-sans">{health.stage}</span></>}
                {health.stage && health.next_hearing_date && ' · '}
                {health.next_hearing_date && <>NEXT HEARING: <span className="text-[#8A6D2F] font-sans font-mono">{health.next_hearing_date}</span></>}
              </p>
            )}
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="self-start md:self-auto px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            {isEditing ? 'Cancel Edits' : 'Edit Matter'}
          </button>
        </div>

        <MatterClosurePanel
          matterId={id}
          status={matter.status}
          isDemo={!!matter.is_demo}
          onShowUnavailablePrompt={() => setShowUnavailablePrompt(true)}
          onClosureChanged={fetchMatter}
        />

        {/* Neutral prompt — shown when a reviewer submits a write instead of
            silently pretending it succeeded on the read-only demo Matter. */}
        {showUnavailablePrompt && (
          <div className="mb-8 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs font-semibold text-[#5C5340]">
              Function available after production activation.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnavailablePrompt(false)}
                className="text-xs font-bold text-[#726B58] hover:text-[#6F5624]"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Command Center — Search Experience + Action Cards (Product
            Direction, Phase A). The search field submits to the existing,
            already-shipped GET /search page (backed by GET /api/search),
            matter-scoped exactly like the "Search this Matter" link it
            replaces — no new backend surface. Action Cards are real
            navigational shortcuts to already-existing routes, not fabricated
            functionality; workflow-stage-aware prioritization is Phase B. */}
        <div className="mb-8">
          <form
            action="/search"
            method="get"
            className="relative flex items-center bg-white border border-[#E7DFC9] rounded-xl shadow-sm focus-within:border-[#8A6D2F] transition-all"
          >
            <input type="hidden" name="matter_id" value={id} />
            <input
              type="text"
              name="q"
              placeholder="Search cases, Acts, Sections, judgments, or ask AI about your matter..."
              className="w-full bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-medium placeholder-[#726B58] px-5 py-4 md:py-5"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex-none pr-4 md:pr-5 text-[#8A6D2F] hover:text-[#6F5624] bg-transparent border-none outline-none cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {/* Action Cards navigate for real — Product Review Mode requires
                every Action Card destination to be directly inspectable
                (route by route), not intercepted here. Each destination
                page (ai-chamber, documents/new, draft-builder) guards its
                own real write/AI actions at the point of use instead. */}
            {[
              { label: '🔍 Search this Matter', href: `/search?matter_id=${id}&type=document,proceeding,court_note` },
              { label: '📤 Upload Documents', href: `/documents/new?matter_id=${id}` },
              { label: '⚡ Ask AI', href: '/dashboard/ai-chamber' },
              { label: '✍️ Draft Document', href: '/dashboard/draft-builder' },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="px-4 py-2 bg-[#FBF8F1] hover:bg-[#F4EEE0] border border-[#E7DFC9] text-[#8A6D2F] hover:text-[#6F5624] font-bold text-xs rounded-lg transition-all whitespace-nowrap"
              >
                {card.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Prepare for Hearing — Seven-Day Case Preparation Workflow
                (Product Direction, Milestone 3). Conditionally rendered:
                entirely absent unless a Proceeding on this Matter has a
                hearing within the next 7 days, so a Matter with nothing
                imminent looks exactly as it did before this milestone. */}
            {preparationItems.length > 0 && (
              <div className="bg-white border border-[#8A6D2F]/40 rounded-xl p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-4">
                  ⏰ Prepare for Hearing
                </h2>
                <div className="space-y-5">
                  {preparationItems.map((item) => (
                    <div key={item.case_id} className="border-l-2 border-[#8A6D2F]/60 pl-4">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{item.hearing_date}</span>
                        {item.court_forum_display && (
                          <span className="text-[10px] text-[#726B58]">{item.court_forum_display}</span>
                        )}
                        <Link href={`/cases/${item.case_id}`} className="text-[10px] font-bold text-[#8A6D2F] hover:underline">
                          {item.case_title}
                        </Link>
                      </div>
                      {item.stage && (
                        <p className="text-[10px] font-bold text-[#726B58] uppercase tracking-widest mt-1">
                          Stage: <span className="text-[#3A3222] font-sans normal-case">{item.stage}</span>
                        </p>
                      )}
                      {item.last_note && (
                        <p className="text-xs text-[#3A3222] mt-1">Last Court Note: {item.last_note}</p>
                      )}
                      {item.pending_actions.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-widest">
                            Pending Actions ({item.pending_actions.length})
                          </span>
                          <ul className="mt-1 space-y-1">
                            {item.pending_actions.map((action) => (
                              <li key={action.id} className="text-xs text-[#3A3222]">☐ {action.action_text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.documents.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-widest mr-1">
                            Documents ({item.documents.length}):
                          </span>
                          {item.documents.map((doc) => (
                            <span
                              key={doc.id}
                              className="text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider"
                            >
                              {doc.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matter Health */}
            {health && (
              <div id="health" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Matter Health</h2>
                  {health.needs_attention && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                      NEEDS ATTENTION
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Current Stage</span>
                    <span className="text-sm font-bold text-[#8A6D2F] font-mono uppercase">{health.stage || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Next Hearing</span>
                    <span className="text-sm font-mono font-bold text-[#3A3222]">{health.next_hearing_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Pending Actions</span>
                    <span className="text-sm font-bold text-[#3A3222]">{health.pending_action_count}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Last Activity</span>
                    <span className="text-sm font-bold text-[#3A3222]">{health.last_hearing_date || 'N/A'}</span>
                  </div>
                </div>
                {health.last_note && (
                  <p className="text-xs text-[#6F5624] mt-4 pt-4 border-t border-[#F4EEE0]">
                    <span className="font-bold text-[#4A4130]">{health.last_case_title}</span> · {health.last_court_forum_display}: {health.last_note}
                  </p>
                )}
              </div>
            )}

            {/* Recent Court Note — latest only; full aggregated history is
                progressive disclosure, not shown immediately */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Recent Court Note</h2>
              {matterCourtNotes.length === 0 ? (
                <p className="text-xs font-semibold text-[#6F5624]">No Court Notes recorded yet for this matter.</p>
              ) : (
                <>
                  <div className="border-l-2 border-[#F4EEE0] pl-4">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{matterCourtNotes[0].hearing_date}</span>
                      <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-wider">{matterCourtNotes[0].stage}</span>
                      <span className="text-[10px] text-[#726B58]">· {matterCourtNotes[0].court_forum_display}</span>
                      <Link href={`/cases/${matterCourtNotes[0].case_id}`} className="text-[10px] font-bold text-[#8A6D2F] hover:underline">
                        {matterCourtNotes[0].case_title}
                      </Link>
                    </div>
                    <p className="text-xs text-[#3A3222] mt-1">{matterCourtNotes[0].note}</p>
                    {matterCourtNotes[0].next_actions && (
                      <p className="text-xs text-[#8A6D2F] font-semibold mt-1">Next: {matterCourtNotes[0].next_actions}</p>
                    )}
                  </div>

                  {matterCourtNotes.length > 1 && (
                    <>
                      <button
                        onClick={() => setShowFullCourtNoteHistory(!showFullCourtNoteHistory)}
                        className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline"
                      >
                        {showFullCourtNoteHistory ? 'Hide full history' : `View full history (${matterCourtNotes.length}) →`}
                      </button>
                      {showFullCourtNoteHistory && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-[#F4EEE0]">
                          {matterCourtNotes.slice(1).map((cn) => (
                            <div key={cn.id} className="border-l-2 border-[#F4EEE0] pl-4">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{cn.hearing_date}</span>
                                <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-wider">{cn.stage}</span>
                                <span className="text-[10px] text-[#726B58]">· {cn.court_forum_display}</span>
                                <Link href={`/cases/${cn.case_id}`} className="text-[10px] font-bold text-[#8A6D2F] hover:underline">
                                  {cn.case_title}
                                </Link>
                              </div>
                              <p className="text-xs text-[#3A3222] mt-1">{cn.note}</p>
                              {cn.next_actions && (
                                <p className="text-xs text-[#8A6D2F] font-semibold mt-1">Next: {cn.next_actions}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Pending Actions — structured, derived from Court Notes */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Pending Actions</h2>
              {matterTasks.filter((t) => t.status === 'PENDING').length === 0 ? (
                <p className="text-xs font-semibold text-[#6F5624]">No pending actions.</p>
              ) : (
                <ul className="space-y-3">
                  {matterTasks
                    .filter((task) => task.status === 'PENDING')
                    .map((task) => (
                      <li key={task.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-[#FBF8F1]/50 border-[#F4EEE0]">
                        <div>
                          <p className="text-sm font-medium text-[#3A3222]">☐ {task.action_text}</p>
                          <span className="text-[10px] text-[#726B58]">
                            {task.hearing_date && <>Due: {task.hearing_date} · </>}Source: {task.case_title}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-none">
                          <button
                            onClick={() => handleTaskStatusChange(task.id, 'COMPLETED')}
                            className="text-[10px] font-bold uppercase text-[#8A6D2F] hover:underline"
                          >
                            Complete
                          </button>
                          <Link
                            href={`/cases/${task.case_id}`}
                            className="text-[10px] font-bold uppercase text-[#726B58] hover:underline"
                          >
                            View Source Note
                          </Link>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {isEditing ? (
              <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Edit Matter</h2>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Matter Title</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as MatterStatus)}
                      className="w-full px-4 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                    >
                      {MATTER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-sans"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-[#E7DFC9] text-[#6F5624] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow"
                    >
                      Save Updates
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div id="overview" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm space-y-6 scroll-mt-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-2">Matter Overview</h2>
                  <p className="text-sm text-[#4A4130] leading-relaxed font-medium whitespace-pre-line">
                    {matter.description || 'No description provided.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 border-t border-[#F4EEE0] pt-6">
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">PRACTICE AREA</span>
                    <span className="text-sm font-bold text-[#3A3222]">{matter.practice_area || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">OPPOSING PARTY</span>
                    <span className="text-sm font-bold text-[#3A3222]">{matter.opposing_party_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">OPENED</span>
                    <span className="text-xs font-mono text-[#5C5340]">{new Date(matter.opened_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">LAST UPDATED</span>
                    <span className="text-xs font-mono text-[#5C5340]">{new Date(matter.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Proceedings Section */}
            <div id="proceedings" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#F4EEE0]">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Proceedings</h2>
                  <span className="text-[10px] font-mono text-[#726B58] font-bold">{proceedings.length} LINKED</span>
                </div>
                <button
                  onClick={() => setShowProceedingForm(!showProceedingForm)}
                  className="bg-[#FBF8F1] hover:bg-[#F4EEE0] border border-[#E7DFC9] text-[#8A6D2F] hover:text-[#6F5624] font-bold text-xs px-4 py-2 rounded-lg transition-all uppercase tracking-wider"
                >
                  {showProceedingForm ? 'Close' : 'Add Proceeding'}
                </button>
              </div>

              {showProceedingForm && (
                <form onSubmit={handleCreateProceeding} className="mb-4 p-4 bg-[#FBF8F1]/50 border border-[#F4EEE0] rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={proceedingTitle}
                    onChange={(e) => setProceedingTitle(e.target.value)}
                    placeholder="Proceeding title *"
                    className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  />
                  <select
                    value={proceedingCountryCode}
                    onChange={(e) => setProceedingCountryCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  >
                    <option value="IN">IN (BNSS Compliant)</option>
                    <option value="US">US (FRCP Compliant)</option>
                    <option value="UK">UK (CPR Compliant)</option>
                  </select>
                  <input
                    type="text"
                    value={proceedingCourt}
                    onChange={(e) => setProceedingCourt(e.target.value)}
                    placeholder="Court / Forum"
                    className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium md:col-span-2"
                  />
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg">
                      Create
                    </button>
                  </div>
                </form>
              )}

              {proceedings.length > 0 ? (
                <div className="space-y-4">
                  {proceedings.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 border border-[#F4EEE0] rounded-xl bg-[#FBF8F1]/50 hover:border-[#F1E9D3] hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded">
                            {c.id.slice(0, 8)}
                          </span>
                          <span className="text-xs font-bold text-[#6F5624]">{c.court || 'N/A'}</span>
                        </div>
                        <h3 className="font-bold text-sm text-[#3A3222]">{c.title}</h3>
                        <p className="text-xs text-[#726B58] font-mono mt-1">Status: {c.status}</p>
                      </div>
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-3.5 py-1.5 border border-[#F1E9D3] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-xs rounded-lg uppercase tracking-wider transition-all"
                      >
                        Workspace →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-[#FBF8F1]/50 border border-[#F4EEE0] rounded-xl">
                  <p className="text-xs font-semibold text-[#6F5624]">No proceedings linked to this matter yet.</p>
                  <p className="text-[10px] text-[#726B58] mt-0.5">Not every matter becomes litigation — this is a valid state.</p>
                </div>
              )}
            </div>

            {/* Matter Timeline — unified chronology: Court Note-generated
                events (read-only, source_type='HEARING') alongside manual
                entries (source_type='MANUAL'), same table/list since
                Milestone 1 — this section only renames and repositions it,
                the "Add Entry" capability is unchanged. */}
            <div id="timeline" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#F4EEE0]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Matter Timeline</h2>
                <button
                  onClick={() => setShowEventForm(!showEventForm)}
                  className="bg-[#FBF8F1] hover:bg-[#F4EEE0] border border-[#E7DFC9] text-[#8A6D2F] hover:text-[#6F5624] font-bold text-xs px-4 py-2 rounded-lg transition-all uppercase tracking-wider"
                >
                  {showEventForm ? 'Close' : 'Add Entry'}
                </button>
              </div>

              {showEventForm && (
                <form onSubmit={handleCreateEvent} className="mb-4 p-4 bg-[#FBF8F1]/50 border border-[#F4EEE0] rounded-xl flex flex-col md:flex-row gap-3">
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  />
                  <input
                    type="text"
                    required
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="What happened?"
                    className="flex-1 px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg whitespace-nowrap">
                    Add
                  </button>
                </form>
              )}

              {events.length > 0 ? (
                <ol className="relative border-l border-[#E7DFC9] ml-2 space-y-5">
                  {events.map((ev) => (
                    <li key={ev.id} className="ml-4">
                      <div className="absolute w-2 h-2 bg-[#8A6D2F] rounded-full -ml-[21px] mt-1.5"></div>
                      <span className="text-[10px] font-mono font-bold text-[#8A6D2F]">
                        {new Date(ev.event_date).toLocaleDateString()}
                      </span>
                      {ev.source_type === 'HEARING' && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#726B58] border border-[#E7DFC9] rounded px-1.5 py-0.5">
                          Court Note
                        </span>
                      )}
                      <p className="text-sm text-[#3A3222] font-medium">{ev.description}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-center py-10 bg-[#FBF8F1]/50 border border-[#F4EEE0] rounded-xl">
                  <p className="text-xs font-semibold text-[#6F5624]">No chronology entries yet.</p>
                  <p className="text-[10px] text-[#726B58] mt-0.5">Add the first entry to start this matter&apos;s timeline.</p>
                </div>
              )}
            </div>

            {/* Documents — Milestone 4, Prepare Document. Real, read-only
                data from the existing GET /api/documents?matter_id= route
                (extended, not duplicated, with document_type/version_count/
                updated_at) — same reuse pattern as every other section on
                this page. */}
            <div id="documents" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Documents</h2>
                <Link
                  href={`/documents/new?matter_id=${id}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline"
                >
                  + Prepare New Document
                </Link>
              </div>
              {matterDocuments.length > 0 ? (
                <div className="space-y-3">
                  {matterDocuments.map((docItem) => (
                    <div key={docItem.id} className="flex items-center justify-between border-b border-[#F4EEE0] pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-bold text-[#3A3222]">{docItem.title}</p>
                        <p className="text-[10px] text-[#726B58] font-bold uppercase tracking-wider">
                          {getDocumentType(docItem.document_type)?.label ?? 'Uploaded'} · v{docItem.version_count || 1} ·{' '}
                          {new Date(docItem.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/documents/${docItem.id}`}
                        className="text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2.5 py-1 rounded uppercase tracking-wider hover:bg-[#F4EEE0]"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl">
                  <p className="text-xs font-semibold text-[#6F5624]">No documents yet.</p>
                  <p className="text-[10px] text-[#726B58] mt-1">Prepare a new document to get started.</p>
                </div>
              )}
            </div>
            <ComingSoonPanel
              id="matter-evidence"
              title="Evidence"
              description="Structured evidence registry for this matter is planned for a future milestone."
            />
            <ComingSoonPanel
              title="Drafts & Research"
              description="AI-assisted drafting and legal research tied to this matter is planned for a future milestone."
            />
          </div>

          {/* Right Sidebar - Team */}
          <div className="space-y-6">
            <div id="team" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Team</h2>
              {participants.length > 0 ? (
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-[#F4EEE0] pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-bold text-[#3A3222]">{p.user_name || p.user_email}</p>
                        <p className="text-[10px] text-[#726B58] font-mono">{p.user_email}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                        {p.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6F5624] text-center py-4">No team members assigned yet.</p>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
