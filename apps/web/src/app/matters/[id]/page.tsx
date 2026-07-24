'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import BrandBackground from '@/components/BrandBackground';
import { CourtPicker } from '@/components/ecourts/CourtPicker';
import { AuthOrReviewGate, ReviewModeActionNotice } from '@/components/ReviewModeNotice';
import CourtBadge from '@/components/CourtBadge';
import LitigationJourney from '@/components/LitigationJourney';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES, MATTER_CATEGORIES, type MatterStatus, type MatterEngagementType } from '@/lib/domain/matter';
import { getDocumentType } from '@/lib/domain/document-type';
import { CERTIFIED_COPY_STATUS_LABELS } from '@/lib/domain/court-order';
import { HEARING_OUTCOME_LABELS, isTerminalHearingOutcome, type HearingOutcome } from '@/lib/domain/court-note';
import { buildActivityItems, mergeMatterOrders, type ActivityItem, type ActivityType, type MatterOrder } from '@/lib/domain/matter-activity';
import MatterClosurePanel from './MatterClosurePanel';

interface Matter {
  id: string;
  title: string;
  matter_number: string | null;
  engagement_type: MatterEngagementType;
  matter_category: string | null;
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
  current_stage: string | null;
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
  relationship_to_prior: string | null;
  prior_proceeding_id: string | null;
}

const PROCEEDING_RELATIONSHIP_LABELS: Record<string, string> = {
  APPEAL: 'Appeal',
  REVISION: 'Revision',
  REVIEW: 'Review',
  WRIT: 'Writ',
  SLP: 'Special Leave Petition',
  EXECUTION: 'Execution',
  COMPLIANCE: 'Compliance',
  REMAND: 'Remand',
  RESTORATION: 'Restoration',
  RECALL: 'Recall',
  CONNECTED_PROCEEDING: 'Connected Proceeding',
  OTHER: 'Other',
};

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
  hearing_outcome: HearingOutcome;
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

/** This page's own activity feed shape, parameterized with its fuller,
 * page-local Court Note/Order/Task/Event interfaces — see
 * @/lib/domain/matter-activity for the shared merge/sort logic this
 * page and the /system/runtime diagnostics page both call. */
type PageActivityItem = ActivityItem<MatterCourtNote, MatterOrder, MatterTaskItem, MatterEvent>;

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

// Pure derived value from a date already present in the Matter Health
// payload — never persisted, so it can't itself go stale.
function daysRemainingLabel(nextHearingDate: string | null): string {
  if (!nextHearingDate) return 'N/A';
  const target = new Date(`${nextHearingDate}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return 'N/A';
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffDays = Math.round((target.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  return `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
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
  const [matterOrders, setMatterOrders] = useState<MatterOrder[]>([]);
  const [activityFilter, setActivityFilter] = useState<'ALL' | ActivityType>('ALL');
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
  const [editMatterCategory, setEditMatterCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState('');

  const [showProceedingForm, setShowProceedingForm] = useState(false);
  const [proceedingTitle, setProceedingTitle] = useState('');
  const [proceedingCountryCode, setProceedingCountryCode] = useState('IN');
  const [proceedingCourt, setProceedingCourt] = useState('');
  const [proceedingPriorId, setProceedingPriorId] = useState('');
  const [proceedingRelationship, setProceedingRelationship] = useState('');
  const [showProceedingCourtPicker, setShowProceedingCourtPicker] = useState(false);

  // Matter Notes — an informal scratchpad, deliberately separate from the
  // formal Overview description and from any court record (same rule the
  // Proceeding-level Private Scratchpad already follows). UI-structure pass
  // only: persisted to localStorage per browser for now rather than a new
  // Matter.notes column — see the note above handleSaveMatterNotes.
  const [matterNotes, setMatterNotes] = useState('');
  const [matterNotesSaved, setMatterNotesSaved] = useState(false);

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
    setEditMatterCategory(data.matter.matter_category ?? '');
    setEditDescription(data.matter.description ?? '');
  }, [id]);

  const fetchProceedings = useCallback(async () => {
    const res = await fetch(`/api/matters/${id}/proceedings`);
    if (!res.ok) return;
    const data = await res.json();
    setProceedings(data.proceedings);
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

  // Court Orders are a Proceeding-level record (GET /api/cases/[id]/orders)
  // — there is no matter-scoped orders endpoint. This aggregates them by
  // fetching every linked Proceeding's orders in parallel and merging by
  // date, so the Matter Workspace can show them without a new backend
  // route. Depends on `proceedings` rather than running once on `id`,
  // since it needs that list to know which Proceedings to ask.
  const fetchMatterOrders = useCallback(async (proceedingList: Proceeding[]) => {
    if (proceedingList.length === 0) {
      setMatterOrders([]);
      return;
    }
    const perProceeding = await Promise.all(
      proceedingList.map(async (p) => {
        const res = await fetch(`/api/cases/${p.id}/orders`);
        const orders: Array<Omit<MatterOrder, 'proceeding_title'>> = res.ok ? (await res.json()).orders : [];
        return { proceedingTitle: p.title, orders };
      })
    );
    setMatterOrders(mergeMatterOrders(perProceeding));
  }, []);

  useEffect(() => {
    fetchMatterOrders(proceedings);
  }, [proceedings, fetchMatterOrders]);

  // Matter Notes — loaded from localStorage per-Matter. This is a UI-
  // structure pass, not full persistence: Matter has no `notes` column
  // today (only the formal `description`), and adding one is a schema
  // change that belongs in the follow-up implementation pass once this
  // layout itself is approved. localStorage keeps the interaction real to
  // evaluate (typing, saving, the confirmation) without that migration.
  useEffect(() => {
    const stored = window.localStorage.getItem(`nextcasehq:matter-notes:${id}`);
    if (stored) setMatterNotes(stored);
  }, [id]);

  const handleSaveMatterNotes = () => {
    window.localStorage.setItem(`nextcasehq:matter-notes:${id}`, matterNotes);
    setMatterNotesSaved(true);
    setTimeout(() => setMatterNotesSaved(false), 2000);
  };

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

  // Matter Activity — one merged, chronological feed instead of the three
  // separate cards (Recent Court Note / Pending Actions / Timeline) this
  // replaces. Stage-change and next-hearing-change rows the layout
  // proposal sketched are deferred (they'd need a diff across consecutive
  // Court Notes, not built yet) — each Court Note entry below already
  // shows its own next_hearing_date inline, so that information isn't
  // lost, just not broken out as its own row yet. Manual Timeline entries
  // are included; HEARING-sourced MatterEvents are deliberately excluded
  // here since matterCourtNotes already covers the same hearings with
  // richer detail — including both would show every hearing twice.
  const activityItems = useMemo<PageActivityItem[]>(
    () => buildActivityItems(matterCourtNotes, matterOrders, matterTasks, events),
    [matterCourtNotes, matterOrders, matterTasks, events]
  );

  const filteredActivity = useMemo(
    () => (activityFilter === 'ALL' ? activityItems : activityItems.filter((i) => i.type === activityFilter)),
    [activityItems, activityFilter]
  );

  const activityCounts = useMemo(() => {
    const counts: Record<ActivityType, number> = { HEARING: 0, ORDER: 0, ACTION: 0, MILESTONE: 0 };
    activityItems.forEach((i) => { counts[i.type] += 1; });
    return counts;
  }, [activityItems]);

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
      body: JSON.stringify({
        title: editTitle,
        status: editStatus,
        matter_category: editMatterCategory || null,
        description: editDescription,
      }),
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
    const res = await fetch(`/api/matters/${id}/proceedings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: proceedingTitle,
        country_code: proceedingCountryCode,
        court: proceedingCourt || undefined,
        prior_proceeding_id: proceedingPriorId || undefined,
        relationship_to_prior: proceedingPriorId ? proceedingRelationship || undefined : undefined,
      }),
    });
    if (!res.ok) return;
    setProceedingTitle('');
    setProceedingCourt('');
    setProceedingPriorId('');
    setProceedingRelationship('');
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
          <AuthOrReviewGate
            reviewModeActive={reviewModeActive}
            what="this matter"
            authDescription="Sign in to view this matter."
          />
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
            {/* Stage/Next Hearing deliberately not repeated here — the
                At a Glance strip immediately below is the one place that
                answers it, so identity stays pure identity (Phase 2
                refinement: first-screen review). */}
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
          <ReviewModeActionNotice
            action="Editing this matter"
            onDismiss={() => setShowUnavailablePrompt(false)}
            className="mb-8 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap"
          />
        )}

        {/* At a Glance — the five questions an advocate should be able to
            answer without scrolling (Phase 2 refinement): what matter is
            this (Identity, above), what's next hearing, what's urgent,
            what happened most recently, and is there a court order to
            know about. Pure re-presentation of data already fetched for
            Matter Health / Matter Activity / Court Orders below — nothing
            new is computed or stored here, this is prioritisation, not
            new content. */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm mb-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <span className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">Next Hearing</span>
            <span className="text-sm font-bold font-mono text-[#3A3222]">{health?.next_hearing_date || 'Not scheduled'}</span>
          </div>
          <a href="#activity" className="block hover:opacity-80 transition-opacity">
            <span className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">Urgent Actions</span>
            {activityCounts.ACTION === 0 ? (
              <span className="text-sm font-bold text-[#3A3222]">None pending</span>
            ) : (
              <span className="text-sm font-bold text-[#8A6D2F]">
                {activityCounts.ACTION} pending — {activityItems.find((i) => i.type === 'ACTION')?.task?.action_text}
              </span>
            )}
          </a>
          <a href="#activity" className="block hover:opacity-80 transition-opacity">
            <span className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">Latest Activity</span>
            {activityItems.length === 0 ? (
              <span className="text-sm font-bold text-[#3A3222]">Nothing recorded yet</span>
            ) : (
              <span className="text-sm font-semibold text-[#3A3222] line-clamp-2">
                {activityItems[0].type === 'HEARING' && activityItems[0].courtNote?.note}
                {activityItems[0].type === 'ORDER' && activityItems[0].order?.summary}
                {activityItems[0].type === 'ACTION' && activityItems[0].task?.action_text}
                {activityItems[0].type === 'MILESTONE' && activityItems[0].event?.description}
                <span className="text-[#B0A588] font-normal"> ({activityItems[0].date})</span>
              </span>
            )}
          </a>
          <a href="#orders" className="block hover:opacity-80 transition-opacity">
            <span className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">Latest Court Order</span>
            {matterOrders.length === 0 ? (
              <span className="text-sm font-bold text-[#3A3222]">None recorded</span>
            ) : (
              <span className="text-sm font-semibold text-[#3A3222] line-clamp-2">
                {matterOrders[0].summary} <span className="text-[#B0A588] font-normal">({matterOrders[0].order_date})</span>
              </span>
            )}
          </a>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Current Stage</span>
                    <span className="text-sm font-bold text-[#8A6D2F] font-mono uppercase">{health.stage || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Next Hearing</span>
                    <span className="text-sm font-mono font-bold text-[#3A3222]">{health.next_hearing_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest mb-1">Court</span>
                    {health.last_court_forum_display || matter?.court ? (
                      <CourtBadge court={health.last_court_forum_display || matter?.court} />
                    ) : (
                      <span className="text-sm font-bold text-[#3A3222]">N/A</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">Days Remaining</span>
                    <span className="text-sm font-bold text-[#3A3222]">{daysRemainingLabel(health.next_hearing_date)}</span>
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

            {/* Court Orders — the biggest gap identified in the Phase 2
                architectural review: orders were previously visible only
                inside each individual Proceeding's own Case Workspace, one
                at a time. This aggregates every linked Proceeding's orders
                (see fetchMatterOrders above) so a Matter with, say, a trial
                court Proceeding and an Appeal shows both forums' orders
                in one place — the Proceeding tag on each row makes clear
                which forum issued it. Deliberately read-only here: advancing
                certified-copy status or attaching a copy still happens on
                the Proceeding's own Case Workspace (linked below) rather
                than duplicating that write path in two places. */}
            <div id="orders" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Court Orders</h2>
                  {matterOrders.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9]">
                      {matterOrders.length}
                    </span>
                  )}
                </div>
                {proceedings.length > 1 && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#B0A588]">
                    Across {proceedings.length} Proceedings
                  </span>
                )}
              </div>
              {matterOrders.length === 0 ? (
                <p className="text-xs font-semibold text-[#6F5624]">No orders recorded yet for this matter.</p>
              ) : (
                <div className="space-y-4">
                  {matterOrders.map((order) => (
                    <div key={order.id} className="border-l-2 border-[#F4EEE0] pl-4">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{order.order_date}</span>
                        <Link
                          href={`/cases/${order.case_id}`}
                          className="text-[9px] font-bold uppercase tracking-wider bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9] px-2 py-0.5 rounded-full hover:bg-[#F4EEE0]"
                        >
                          {order.proceeding_title}
                        </Link>
                        {order.certified_copy_required && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9] uppercase tracking-wider">
                            Certified Copy: {CERTIFIED_COPY_STATUS_LABELS[order.certified_copy_status]}
                          </span>
                        )}
                        {order.document_id && (
                          <Link
                            href={`/documents/${order.document_id}`}
                            className="text-[9px] font-bold text-[#8A6D2F] uppercase tracking-wider hover:underline"
                          >
                            View Copy →
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-[#3A3222] mt-1">{order.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Litigation Journey and Command Center — repositioned below
                the At a Glance strip and Court Orders (Phase 2
                refinement). Neither answers one of the five first-screen
                questions directly, so per the reviewed hierarchy they
                belong in "everything else," not ahead of Next Hearing /
                Urgent Actions / Latest Activity / Latest Court Order. */}
            <LitigationJourney
              engagementType={matter.engagement_type}
              matterCategory={matter.matter_category}
              currentStage={matter.current_stage}
            />

            {/* Command Center — Search Experience + Action Cards (Product
                Direction, Phase A). The search field submits to the existing,
                already-shipped GET /search page (backed by GET /api/search),
                matter-scoped exactly like the "Search this Matter" link it
                replaces — no new backend surface. Action Cards are real
                navigational shortcuts to already-existing routes, not fabricated
                functionality; workflow-stage-aware prioritization is Phase B. */}
            <div>
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
                  { label: '🤖 AI-Draft a Document', href: `/documents/new?matter_id=${id}` },
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
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Matter Category</label>
                    <select
                      value={editMatterCategory}
                      onChange={(e) => setEditMatterCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                    >
                      <option value="">Unspecified</option>
                      {MATTER_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-t border-[#F4EEE0] pt-6">
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">PRACTICE AREA</span>
                    <span className="text-sm font-bold text-[#3A3222]">{matter.practice_area || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">OPPOSING PARTY</span>
                    <span className="text-sm font-bold text-[#3A3222]">{matter.opposing_party_name || 'N/A'}</span>
                  </div>
                  <div>
                    {/* Captured on the Matter creation form since the very
                        first version of this page, but never displayed
                        anywhere until now (Phase 2 review, priority 3). */}
                    <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">OPPOSING COUNSEL</span>
                    <span className="text-sm font-bold text-[#3A3222]">{matter.opposing_counsel || 'N/A'}</span>
                  </div>
                  {/* Next Hearing / Latest Order / Pending Tasks / Latest
                      Activity deliberately removed from here (Phase 2
                      refinement pass) — the At a Glance strip above the
                      fold now answers all four, and repeating them here
                      was exactly the duplication section 2 of the review
                      asked to resolve, not new content to prioritise. */}
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

            {/* Matter Notes — informal working memory, deliberately
                separate from the formal Overview description above and
                from any court record (Court Notes, Court Orders). Same
                separation rule the Proceeding-level Private Scratchpad
                already follows on the Case Workspace page. */}
            <div id="notes" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Matter Notes</h2>
                {matterNotesSaved && <span className="text-xs text-green-800 font-bold font-sans">✓ Saved</span>}
              </div>
              <p className="text-[10px] text-[#B0A588] font-semibold mb-3">
                Informal working notes only — not part of the Overview description or any court record.
              </p>
              <textarea
                value={matterNotes}
                onChange={(e) => setMatterNotes(e.target.value)}
                placeholder="Working notes, reminders, or context for this matter..."
                rows={5}
                className="w-full p-4 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-mono text-[#3A3222]"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveMatterNotes}
                  className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg"
                >
                  Save Notes
                </button>
              </div>
            </div>

            {/* Proceedings Section */}
            <div id="proceedings" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#F4EEE0]">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Proceedings</h2>
                  <span className="text-[10px] font-mono text-[#726B58] font-bold">{proceedings.length} LINKED</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Optional, contextual — opens in a new tab so it never
                      interrupts or loses the advocate's place in this Matter. */}
                  <Link
                    href="/legal-resources/practice-guides"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F] transition-colors"
                  >
                    Practice Guides →
                  </Link>
                  <button
                    onClick={() => setShowProceedingForm(!showProceedingForm)}
                    className="bg-[#FBF8F1] hover:bg-[#F4EEE0] border border-[#E7DFC9] text-[#8A6D2F] hover:text-[#6F5624] font-bold text-xs px-4 py-2 rounded-lg transition-all uppercase tracking-wider"
                  >
                    {showProceedingForm ? 'Close' : 'Add Proceeding'}
                  </button>
                </div>
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
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={proceedingCourt}
                        onChange={(e) => setProceedingCourt(e.target.value)}
                        placeholder="Court / Forum"
                        className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProceedingCourtPicker((v) => !v)}
                        className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]"
                      >
                        {showProceedingCourtPicker ? 'Close' : 'Find court →'}
                      </button>
                    </div>
                    {showProceedingCourtPicker && (
                      <div className="mt-3">
                        <CourtPicker
                          onSelect={(name) => {
                            setProceedingCourt(name);
                            setShowProceedingCourtPicker(false);
                          }}
                          onCancel={() => setShowProceedingCourtPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  {proceedings.length > 0 && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#E7DFC9]/60 mt-1">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">
                          This continues an earlier Proceeding (optional)
                        </label>
                        <select
                          value={proceedingPriorId}
                          onChange={(e) => {
                            setProceedingPriorId(e.target.value);
                            if (!e.target.value) setProceedingRelationship('');
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                        >
                          <option value="">None — a standalone Proceeding</option>
                          {proceedings.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}{p.case_number ? ` (${p.case_number})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {proceedingPriorId && (
                        <select
                          required
                          value={proceedingRelationship}
                          onChange={(e) => setProceedingRelationship(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium md:col-span-2"
                        >
                          <option value="">Select relationship *</option>
                          {Object.entries(PROCEEDING_RELATIONSHIP_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
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
                          {c.court ? <CourtBadge court={c.court} /> : <span className="text-xs font-bold text-[#6F5624]">N/A</span>}
                        </div>
                        <h3 className="font-bold text-sm text-[#3A3222]">{c.title}</h3>
                        {/* Stage/next-hearing/status all shown here, not
                            just in the row's own Proceeding page — a
                            multi-proceeding Matter (trial + appeal) needs
                            to stay understandable without a click, per the
                            Phase 2 review's priority 4. */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-xs text-[#726B58] font-mono">Status: {c.status}</span>
                          {c.stage && <span className="text-xs text-[#726B58] font-mono">Stage: {c.stage}</span>}
                          <span className="text-xs text-[#726B58] font-mono">Next hearing: {c.hearing_date || 'Not scheduled'}</span>
                        </div>
                        {c.relationship_to_prior && c.prior_proceeding_id && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1.5">
                            ↳ {PROCEEDING_RELATIONSHIP_LABELS[c.relationship_to_prior] || c.relationship_to_prior} of{' '}
                            {proceedings.find((p) => p.id === c.prior_proceeding_id)?.title || 'an earlier Proceeding'}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-3.5 py-1.5 border border-[#F1E9D3] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-xs rounded-lg uppercase tracking-wider transition-all"
                      >
                        Open Proceeding →
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

            {/* Matter Activity — replaces the previous Recent Court Note,
                Pending Actions, and Matter Timeline cards with one merged,
                chronological stream (Phase 2 architectural review, priority
                0). Filter chips narrow the same list; they never split it
                back into separate views. "Add Entry" (manual milestones)
                is unchanged from the old Timeline card. */}
            <div id="activity" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#F4EEE0]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Matter Activity</h2>
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

              <div className="flex flex-wrap gap-2 mb-5">
                {([
                  ['ALL', `All (${activityItems.length})`],
                  ['HEARING', `Hearings (${activityCounts.HEARING})`],
                  ['ORDER', `Orders (${activityCounts.ORDER})`],
                  ['ACTION', `Actions (${activityCounts.ACTION})`],
                  ['MILESTONE', `Milestones (${activityCounts.MILESTONE})`],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setActivityFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
                      activityFilter === value
                        ? 'bg-[#111111] border-[#111111] text-white'
                        : 'bg-white hover:bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredActivity.length === 0 ? (
                <div className="text-center py-10 bg-[#FBF8F1]/50 border border-[#F4EEE0] rounded-xl">
                  <p className="text-xs font-semibold text-[#6F5624]">
                    {activityItems.length === 0 ? 'No activity recorded yet for this matter.' : 'Nothing of this type yet.'}
                  </p>
                  <p className="text-[10px] text-[#726B58] mt-0.5">Hearings, orders, and actions will appear here as they happen.</p>
                </div>
              ) : (
                <ol className="relative border-l border-[#E7DFC9] ml-2 space-y-5">
                  {filteredActivity.map((item) => (
                    <li key={item.key} className="ml-4">
                      {/* Marker colour is the "stand out naturally" signal
                          (Phase 2 refinement, section 3): a hearing that
                          concludes the Proceeding gets a red marker, every
                          other entry keeps the neutral house colour — no
                          extra chrome needed to see which rows matter. */}
                      <div className={`absolute w-2 h-2 rounded-full -ml-[21px] mt-1.5 ${
                        item.type === 'HEARING' && item.courtNote && isTerminalHearingOutcome(item.courtNote.hearing_outcome)
                          ? 'bg-red-600'
                          : 'bg-[#8A6D2F]'
                      }`}></div>

                      {item.type === 'HEARING' && item.courtNote && (
                        <>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[10px] font-mono font-bold text-[#8A6D2F]">{item.courtNote.hearing_date}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#726B58] border border-[#E7DFC9] rounded px-1.5 py-0.5">Hearing</span>
                            {isTerminalHearingOutcome(item.courtNote.hearing_outcome) ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
                                {HEARING_OUTCOME_LABELS[item.courtNote.hearing_outcome]}
                              </span>
                            ) : item.courtNote.hearing_outcome === 'RESERVED_FOR_ORDERS' ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                                Reserved for Orders
                              </span>
                            ) : item.courtNote.hearing_outcome === 'ADJOURNED' ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#B0A588]">Adjourned</span>
                            ) : null}
                            <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-wider">{item.courtNote.stage}</span>
                            <CourtBadge court={item.courtNote.court_forum_display} />
                            <Link href={`/cases/${item.courtNote.case_id}`} className="text-[10px] font-bold text-[#8A6D2F] hover:underline">
                              {item.courtNote.case_title}
                            </Link>
                          </div>
                          <p className="text-sm text-[#3A3222] font-medium mt-0.5">{item.courtNote.note}</p>
                          {item.courtNote.next_actions && (
                            <p className="text-xs text-[#8A6D2F] font-semibold mt-1">Next: {item.courtNote.next_actions}</p>
                          )}
                          {item.courtNote.next_hearing_date && (
                            <p className="text-[10px] text-[#726B58] mt-1">Next hearing: {item.courtNote.next_hearing_date}</p>
                          )}
                        </>
                      )}

                      {item.type === 'ORDER' && item.order && (
                        <>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[10px] font-mono font-bold text-[#8A6D2F]">{item.order.order_date}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#726B58] border border-[#E7DFC9] rounded px-1.5 py-0.5">Order</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9] px-1.5 py-0.5 rounded-full">
                              {item.order.proceeding_title}
                            </span>
                          </div>
                          <p className="text-sm text-[#3A3222] font-medium mt-0.5">{item.order.summary}</p>
                          {item.order.certified_copy_required && (
                            <p className="text-[10px] text-[#726B58] mt-1">
                              Certified copy: {CERTIFIED_COPY_STATUS_LABELS[item.order.certified_copy_status]}
                            </p>
                          )}
                        </>
                      )}

                      {item.type === 'ACTION' && item.task && (
                        <>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[10px] font-mono font-bold text-[#8A6D2F]">{item.task.hearing_date}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#726B58] border border-[#E7DFC9] rounded px-1.5 py-0.5">Action</span>
                          </div>
                          <p className="text-sm text-[#3A3222] font-medium mt-0.5">☐ {item.task.action_text}</p>
                          <div className="flex gap-3 mt-1.5">
                            <button
                              onClick={() => handleTaskStatusChange(item.task!.id, 'COMPLETED')}
                              className="text-[10px] font-bold uppercase text-[#8A6D2F] hover:underline"
                            >
                              Complete
                            </button>
                            <Link href={`/cases/${item.task.case_id}`} className="text-[10px] font-bold uppercase text-[#726B58] hover:underline">
                              View Source Note
                            </Link>
                          </div>
                        </>
                      )}

                      {item.type === 'MILESTONE' && item.event && (
                        <>
                          <span className="text-[10px] font-mono font-bold text-[#8A6D2F]">
                            {new Date(item.event.event_date).toLocaleDateString()}
                          </span>
                          <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#726B58] border border-[#E7DFC9] rounded px-1.5 py-0.5">
                            Milestone
                          </span>
                          <p className="text-sm text-[#3A3222] font-medium mt-0.5">{item.event.description}</p>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
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
