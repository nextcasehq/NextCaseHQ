'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import BrandBackground from '@/components/BrandBackground';
import EmptyState from '@/components/EmptyState';
import { CourtPicker } from '@/components/ecourts/CourtPicker';
import { AuthOrReviewGate, ReviewModeActionNotice } from '@/components/ReviewModeNotice';
import CourtBadge from '@/components/CourtBadge';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES, type MatterStatus, type MatterEngagementType } from '@/lib/domain/matter';
import { COURT_FORUM_TYPES, COURT_FORUM_LABELS, type CourtForumType } from '@/lib/domain/court-note';
import { COURT_FORUM_COLORS, classifyCourtForumType } from '@/lib/domain/court-forum-colors';

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
  court: string | null;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

function MattersChamberContent() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  // Set only when GET /api/matters returns the `review_mode` marker —
  // i.e. an unauthenticated visitor under PRODUCT_REVIEW_MODE. Never set
  // any other way, so this can't be spoofed into showing for a real,
  // signed-in tenant.
  const [isReviewMode, setIsReviewMode] = useState(false);
  // Only ever set true by a successful, unauthenticated GET /api/beta-status
  // — governs whether the "Authentication Required" wall below uses
  // neutral review-mode wording instead of the normal sign-in wording.
  const [reviewModeActive, setReviewModeActive] = useState(false);
  const [showUnavailablePrompt, setShowUnavailablePrompt] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  // Court-category tabs — office-navigation aid over the free-text
  // Matter.court field, classified via the same keyword matcher the
  // court-colour badges already use, so the tabs and the badge on each row
  // are always in agreement.
  const [selectedCourtCategory, setSelectedCourtCategory] = useState<CourtForumType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [matterNumber, setMatterNumber] = useState('');
  const [engagementType, setEngagementType] = useState<MatterEngagementType>('LITIGATION');
  const [practiceArea, setPracticeArea] = useState('');
  const [clientId, setClientId] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [opposingPartyName, setOpposingPartyName] = useState('');
  const [court, setCourt] = useState('');
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [description, setDescription] = useState('');

  const fetchMatters = useCallback(async (status: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const query = status === 'ALL' ? '' : `?status=${status}`;
      const res = await fetch(`/api/matters${query}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        setMatters([]);
        fetch('/api/beta-status')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.enabled) setReviewModeActive(true);
          })
          .catch(() => {});
        return;
      }
      if (!res.ok) {
        setLoadError('Unable to load matters right now.');
        return;
      }
      const data = await res.json();
      setNeedsAuth(false);
      setMatters(data.matters);
      if (data.review_mode) setIsReviewMode(true);
    } catch {
      setLoadError('Unable to reach the matter workspace service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setClients(data.clients);
    } catch {
      // Client list is a convenience for the create form — a failure here
      // shouldn't block viewing matters.
    }
  }, []);

  useEffect(() => {
    fetchMatters(selectedStatus);
  }, [selectedStatus, fetchMatters]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateNewClient = async () => {
    if (!newClientName) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setClients((prev) => [...prev, { id: data.client.id, name: data.client.name }]);
    setClientId(data.client.id);
    setNewClientName('');
    setShowNewClient(false);
  };

  const handleCreateMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    // Product Review Mode is read-only — the form itself stays fully
    // explorable, but the actual write is guarded here at submit time
    // instead of blocking the form from opening at all.
    if (isReviewMode) {
      setShowUnavailablePrompt(true);
      return;
    }

    const res = await fetch('/api/matters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        matter_number: matterNumber || undefined,
        engagement_type: engagementType,
        practice_area: practiceArea || undefined,
        client_id: clientId || undefined,
        opposing_party_name: opposingPartyName || undefined,
        court: court || undefined,
        description: description || undefined,
      }),
    });
    if (!res.ok) return;

    setTitle('');
    setMatterNumber('');
    setPracticeArea('');
    setClientId('');
    setOpposingPartyName('');
    setCourt('');
    setDescription('');
    setShowCreateForm(false);
    fetchMatters(selectedStatus);
  };

  // Product Review Mode is read-only, but the New Matter form itself is
  // still fully explorable — only the actual submit (handleCreateMatter)
  // is guarded, so a reviewer can inspect the whole form's UX.
  const handleNewMatterClick = () => {
    setShowCreateForm(!showCreateForm);
  };

  const filteredMatters = matters.filter((m) => {
    if (selectedCourtCategory !== 'ALL' && classifyCourtForumType(m.court) !== selectedCourtCategory) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      (m.matter_number ?? '').toLowerCase().includes(q) ||
      (m.client_name ?? '').toLowerCase().includes(q)
    );
  });

  const courtCategoryCounts = COURT_FORUM_TYPES.reduce<Record<string, number>>((acc, type) => {
    acc[type] = matters.filter((m) => classifyCourtForumType(m.court) === type).length;
    return acc;
  }, {});

  if (needsAuth) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-20 text-center">
        <AuthOrReviewGate
          reviewModeActive={reviewModeActive}
          what="the Matter Register"
          authDescription="Sign in to view and manage matters under your tenant."
        />
      </div>
    );
  }

  return (
    <div className="relative isolate flex-1 max-w-7xl w-full mx-auto px-6 py-10">
      <BrandBackground />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E7DFC9]/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">
              Matter Workspace
            </h1>
          </div>
          <p className="text-xs font-semibold text-[#726B58] uppercase tracking-widest mt-1">
            Client engagements — litigation, advisory, and everything in between
          </p>
        </div>
        <button
          onClick={handleNewMatterClick}
          className="self-start md:self-auto bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
        >
          {showCreateForm ? 'Close Form' : 'New Matter'}
        </button>
      </div>

      {/* Neutral prompt — shown when a reviewer submits the form instead of
          silently pretending the write succeeded. */}
      {showUnavailablePrompt && (
        <ReviewModeActionNotice
          action="Creating matters"
          onDismiss={() => setShowUnavailablePrompt(false)}
          className="mb-8 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap"
        />
      )}

      {/* Matter Creation Form */}
      {showCreateForm && (
        <div className="mb-10 p-6 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm animate-fadeIn">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#726B58] mb-4">
            New Matter Entry
          </h2>
          <form onSubmit={handleCreateMatter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Matter Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advisory on Series B financing"
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Matter Number
              </label>
              <input
                type="text"
                value={matterNumber}
                onChange={(e) => setMatterNumber(e.target.value)}
                placeholder="e.g. MAT-2026-014"
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Engagement Type
              </label>
              <select
                value={engagementType}
                onChange={(e) => setEngagementType(e.target.value as MatterEngagementType)}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
              >
                {MATTER_ENGAGEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Practice Area
              </label>
              <input
                type="text"
                value={practiceArea}
                onChange={(e) => setPracticeArea(e.target.value)}
                placeholder="e.g. Corporate Governance"
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Client
              </label>
              <div className="flex gap-2">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                >
                  <option value="">No client linked yet</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewClient(!showNewClient)}
                  className="px-4 py-2.5 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap"
                >
                  + New Client
                </button>
              </div>
              {showNewClient && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client name"
                    className="flex-1 px-4 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewClient}
                    className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Opposing Party
              </label>
              <input
                type="text"
                value={opposingPartyName}
                onChange={(e) => setOpposingPartyName(e.target.value)}
                placeholder="If applicable"
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60">
                  Court / Forum
                </label>
                <button
                  type="button"
                  onClick={() => setShowCourtPicker((v) => !v)}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]"
                >
                  {showCourtPicker ? 'Close' : 'Find court →'}
                </button>
              </div>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="If applicable"
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
              {showCourtPicker && (
                <div className="mt-3">
                  <CourtPicker
                    onSelect={(name) => {
                      setCourt(name);
                      setShowCourtPicker(false);
                    }}
                    onCancel={() => setShowCourtPicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide an overview of the engagement..."
                rows={3}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-sans"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#6F5624] rounded-lg hover:bg-[#FBF8F1] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow transition-all"
              >
                Save Matter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Court Category Tabs — office-navigation aid: quickly narrow the
          register to one court category, colour-coded consistently with
          the CourtBadge on every row. */}
      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCourtCategory('ALL')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
            selectedCourtCategory === 'ALL'
              ? 'bg-[#111111] border-[#111111] text-white'
              : 'bg-white hover:bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340]'
          }`}
        >
          All Courts
          <span className="opacity-70">({matters.length})</span>
        </button>
        {COURT_FORUM_TYPES.map((type) => {
          const colors = COURT_FORUM_COLORS[type];
          const isActive = selectedCourtCategory === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedCourtCategory(type)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all"
              style={
                isActive
                  ? { backgroundColor: colors.text, borderColor: colors.text, color: '#FFFFFF' }
                  : { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }
              }
            >
              <span aria-hidden="true">{colors.icon}</span>
              {COURT_FORUM_LABELS[type]}
              <span className="opacity-70">({courtCategoryCounts[type] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-8">
        <div className="w-full md:flex-1 relative flex items-center bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-1.5 focus-within:border-[#A9843F] transition-all">
          <span className="pl-3 pr-2 text-[#726B58]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search loaded matters by title, matter number, or client..."
            className="w-full bg-transparent border-none outline-none text-[#111111] text-xs md:text-sm font-medium placeholder-[#726B58] py-1.5"
          />
        </div>

        <div className="w-full md:w-auto flex flex-wrap gap-2">
          {['ALL', ...MATTER_STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                selectedStatus === status
                  ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white'
                  : 'bg-[#FBF8F1] hover:bg-[#F4EEE0] border-[#E7DFC9] text-[#5C5340]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-semibold text-center">
          {loadError}
        </div>
      )}

      {/* Matters Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredMatters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {filteredMatters.map((matter) => (
            <div
              key={matter.id}
              className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                    {matter.matter_number || matter.id.slice(0, 8)}
                  </span>
                  <span className="ml-2 text-[10px] font-bold text-[#726B58] border border-[#E7DFC9] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                    {matter.engagement_type.replace('_', ' ')}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  matter.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                  matter.status === 'ON_HOLD' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  matter.status === 'CLOSED' ? 'bg-[#F4EEE0] text-[#5C5340] border border-[#E7DFC9]' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {matter.status}
                </span>
              </div>

              <h2 className="font-bold text-base text-[#111111] group-hover:text-[#8A6D2F] transition-colors mb-1">
                {matter.title}
              </h2>
              <p className="text-xs text-[#726B58] font-bold uppercase tracking-wider mb-2">
                Client: {matter.client_name || 'Not yet linked'}
              </p>
              {matter.court && (
                <div className="mb-3">
                  <CourtBadge court={matter.court} />
                </div>
              )}

              <p className="text-xs text-[#6F5624] leading-relaxed font-medium mb-4 flex-1">
                {matter.practice_area || 'No practice area set.'}
              </p>

              <div className="border-t border-[#F4EEE0] pt-4 flex items-center justify-between mt-auto">
                <div className="text-[10px] font-mono text-[#726B58] uppercase tracking-widest">
                  Opened: <span className="font-sans font-bold text-[#5C5340]">{new Date(matter.created_at).toLocaleDateString()}</span>
                </div>
                <Link
                  href={`/matters/${matter.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624] flex items-center gap-1"
                >
                  Open Workspace →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          }
          title="No Matters Found"
          description="No matters matching current query/filters exist inside your secure multi-tenant partition."
          action={
            <button
              onClick={handleNewMatterClick}
              className="bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
            >
              New Matter
            </button>
          }
        />
      )}
    </div>
  );
}

export default function MattersChamberPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    }>
      <MattersChamberContent />
    </Suspense>
  );
}
