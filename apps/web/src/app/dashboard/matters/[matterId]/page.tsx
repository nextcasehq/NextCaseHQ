'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  getMockMatterById,
  SYNTHETIC_DATA_NOTICE,
  formatMockDate,
  type MockMatter,
} from '../mock-matters';

type TabId = 'overview' | 'documents' | 'proceedings' | 'timeline' | 'tasks' | 'research' | 'parties' | 'arguments' | 'evidence';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'proceedings', label: 'Proceedings' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'research', label: 'Research / Authorities' },
  { id: 'parties', label: 'Parties' },
  { id: 'arguments', label: 'Arguments' },
  { id: 'evidence', label: 'Evidence' },
];

function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function daysRemaining(nextHearingDate: string | null, today: string): number | null {
  if (!nextHearingDate) return null;
  const diff = Math.round((new Date(`${nextHearingDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  return diff;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{label}</p>
      <p className="text-xs text-[#3A3222] font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function SyntheticBadge({ label = 'Synthetic — Demonstration Only' }: { label?: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#C6A253]/40 whitespace-nowrap">
      ⚠ {label}
    </span>
  );
}

function OverviewTab({ matter, today }: { matter: MockMatter; today: string }) {
  const remaining = daysRemaining(matter.nextHearingDate, today);
  return (
    <div className="space-y-4">
      <SectionCard title="Matter Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Matter Title" value={matter.title} />
          <Field label="Case Number" value={matter.caseNumber} />
          <Field label="Court / Bench" value={matter.court} />
          <Field label="Advocate Reference" value={matter.advocateReferenceNumber} />
        </div>
      </SectionCard>

      <SectionCard title="Parties">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Represented Party" value={matter.representedParty} />
          <Field label="Opposing Party" value={matter.opposingParty} />
        </div>
      </SectionCard>

      <SectionCard title="Proceeding Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Current Stage" value={matter.stage} />
          <Field label="Next Hearing" value={formatMockDate(matter.nextHearingDate)} />
          <Field label="Purpose of Next Hearing" value={matter.purposeOfNextHearing || 'Not yet recorded'} />
          <Field
            label="Days Remaining"
            value={remaining === null ? 'Not applicable — no hearing scheduled' : remaining < 0 ? 'Hearing date has passed' : `${remaining} day${remaining === 1 ? '' : 's'}`}
          />
          <Field label="Current Proceeding" value={matter.currentProceeding} />
          <Field label="Proceeding Relationship" value={matter.proceedingRelationship} />
          <Field
            label="Pending Urgent Action"
            value={matter.pendingTaskCount > 0 ? `${matter.pendingTaskCount} task(s) pending — see Tasks` : 'None pending'}
          />
        </div>
      </SectionCard>

      {matter.earlierCaseReference && (
        <SectionCard title="Earlier Case Reference">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Reference Type" value={matter.earlierCaseReference.type} />
            <Field label="Earlier Case Number" value={matter.earlierCaseReference.caseNumber} />
            <Field label="Earlier Court" value={matter.earlierCaseReference.court} />
            <Field label="Earlier Year" value={matter.earlierCaseReference.year} />
            <Field label="Relationship" value={matter.earlierCaseReference.relationship} />
            <Field label="Earlier Party Roles" value={matter.earlierCaseReference.earlierPartyRoles} />
            <Field label="Current Party Roles" value={matter.earlierCaseReference.currentPartyRoles} />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Representation">
        <div className="space-y-2">
          {matter.representation.map((rep, i) => (
            <div key={i} className="flex items-center justify-between text-xs gap-3 flex-wrap">
              <span className="font-semibold text-[#3A3222]">{rep.advocateName} — {rep.role}</span>
              <span className="text-[10px] text-[#8A7A56]">{rep.period}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rep.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>
                {rep.status}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DocumentsTab({ matter, onNotice }: { matter: MockMatter; onNotice: (msg: string) => void }) {
  if (matter.documents.length === 0) {
    return <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl"><p className="text-xs font-semibold text-[#8A7A56]">No documents recorded for this matter yet.</p></div>;
  }
  return (
    <div className="space-y-3">
      {matter.documents.map((doc) => (
        <div key={doc.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-[#111111]">{doc.title}</p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{doc.type} · {formatMockDate(doc.date)} · Related to {doc.relatedProceeding}</p>
            </div>
            <SyntheticBadge />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            <span className="font-bold uppercase tracking-wider text-[#8A7A56]">Status: <span className="font-semibold text-[#3A3222] normal-case">{doc.status}</span></span>
            <span className="font-bold uppercase tracking-wider text-[#8A7A56]">Review: <span className="font-semibold text-[#3A3222] normal-case">{doc.reviewStatus}</span></span>
          </div>
          <div className="flex items-center gap-4 pt-1 border-t border-[#F4EEE0]">
            <button onClick={() => onNotice(`Viewing "${doc.title}" is a prototype action in this demonstration.`)} className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">View</button>
            <Link href="/prototypes/draft-document" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">Draft Related Document</Link>
            <Link href="/prototypes/draft-document" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">Upload New Version</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProceedingsTab({ matter }: { matter: MockMatter }) {
  if (matter.proceedings.length === 0) {
    return <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl"><p className="text-xs font-semibold text-[#8A7A56]">No linked proceedings recorded.</p></div>;
  }
  return (
    <div className="space-y-3">
      {matter.proceedings.map((p, i) => (
        <div key={p.id} className="relative">
          {i > 0 && <div className="absolute -top-3 left-6 text-[#B0A588] text-xs">↓</div>}
          <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-[#111111]">{p.court}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
              <Field label="Case Number" value={p.caseNumber} />
              <Field label="Year" value={p.year} />
              <Field label="Party Roles" value={p.partyRoles} />
              <Field label="Status" value={p.status} />
            </div>
            <p className="text-[10px] text-[#8A7A56] pt-1 border-t border-[#F4EEE0]">Relationship: {p.relationshipToEarlier}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ matter }: { matter: MockMatter }) {
  const sorted = [...matter.timeline].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length === 0) {
    return <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl"><p className="text-xs font-semibold text-[#8A7A56]">No timeline events recorded.</p></div>;
  }
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5">
      <ol className="space-y-4">
        {sorted.map((ev) => (
          <li key={ev.id} className="flex gap-3">
            <span className="flex-none w-2 h-2 rounded-full bg-[#8A6D2F] mt-1.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{formatMockDate(ev.date)}</p>
              <p className="text-xs text-[#3A3222] font-semibold">{ev.label}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TasksTab({ matter }: { matter: MockMatter }) {
  if (matter.tasks.length === 0) {
    return <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl"><p className="text-xs font-semibold text-[#8A7A56]">No tasks pending for this matter.</p></div>;
  }
  const styles: Record<string, string> = {
    Pending: 'bg-sky-50 text-sky-700 border-sky-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className="space-y-2">
      {matter.tasks.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 bg-white border border-[#E7DFC9]/80 rounded-xl p-3 flex-wrap">
          <div>
            <p className="text-xs font-bold text-[#111111]">{t.title}</p>
            {t.dueDate && <p className="text-[10px] text-[#8A7A56] mt-0.5">Due {formatMockDate(t.dueDate)}</p>}
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[t.status]}`}>{t.status}</span>
        </div>
      ))}
    </div>
  );
}

function ResearchTab({ matter }: { matter: MockMatter }) {
  if (matter.research.length === 0) {
    return <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl"><p className="text-xs font-semibold text-[#8A7A56]">No saved citations or authorities for this matter yet. Use Legal Search on the dashboard to add one.</p></div>;
  }
  return (
    <div className="space-y-3">
      {matter.research.map((r) => (
        <div key={r.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-[#111111]">{r.caseTitle}</p>
            <SyntheticBadge label="Unverified — Demonstration Data" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
            <Field label="Court" value={r.court} />
            <Field label="Citation" value={r.citation} />
          </div>
          <Field label="Legal Proposition" value={r.proposition} />
          {r.advocateNote && <Field label="Advocate Note" value={r.advocateNote} />}
          <div className="flex items-center justify-between pt-1 border-t border-[#F4EEE0] flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F]">Linked Use: {r.linkedUse}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588]">{r.verificationStatus}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PartiesTab({ matter }: { matter: MockMatter }) {
  return (
    <div className="space-y-3">
      {matter.parties.map((p) => (
        <div key={p.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-[#111111]">{p.name}</p>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.side === 'Represented' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>
              {p.side}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
            <Field label="Current Role" value={p.currentRole} />
            <Field label="Earlier Role" value={p.earlierRole || 'No earlier role recorded'} />
            <Field label="Contact" value={p.contactPlaceholder} />
            <Field label="Representation Status" value={p.representationStatus} />
          </div>
          {p.earlierRole && (
            <p className="text-[10px] text-[#8A6D2F] font-bold pt-1 border-t border-[#F4EEE0]">
              Role reversal: {p.earlierRole} → {p.currentRole}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-[#B0A588]">None recorded.</p>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {items.map((it, i) => (
            <li key={i} className="text-xs text-[#3A3222]">{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ArgumentsTab({ matter }: { matter: MockMatter }) {
  const a = matter.arguments;
  return (
    <SectionCard title="Arguments — this Matter Register's own record">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F]">Draft Status: {a.draftStatus}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ListBlock title="Issues for Determination" items={a.issuesForDetermination} />
        <ListBlock title="Key Confirmed Facts" items={a.keyConfirmedFacts} />
        <ListBlock title="Applicable Provisions" items={a.applicableProvisions} />
        <ListBlock title="Supporting Authorities" items={a.supportingAuthorities} />
        <ListBlock title="Opponent's Likely Arguments" items={a.opponentLikelyArguments} />
        <ListBlock title="Rebuttal Points" items={a.rebuttalPoints} />
      </div>
      <Field label="Relief Sought" value={a.reliefSought} />
    </SectionCard>
  );
}

function EvidenceTab({ matter }: { matter: MockMatter }) {
  const e = matter.evidence;
  return (
    <SectionCard title="Evidence — this Matter Register's own record">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F]">Proof Status: {e.proofStatus}</span>
        {e.proofStatus === 'AI-assisted working draft' && (
          <span className="text-[9px] text-[#B0A588]">AI-assisted draft only — requires advocate review before use.</span>
        )}
      </div>
      {e.witnesses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Witnesses</p>
          {e.witnesses.map((w, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] bg-[#FBF8F1]/60 rounded-lg p-2.5">
              <Field label={`${w.name} — ${w.role}`} value="" />
              <div />
              <Field label="Examination-in-Chief Prep" value={w.examinationPrep} />
              <Field label="Cross-Examination Prep" value={w.crossExamPrep} />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ListBlock title="Documents & Exhibits" items={e.documentsAndExhibits} />
        <ListBlock title="Facts to Prove" items={e.factsToProve} />
        <ListBlock title="Contradictions" items={e.contradictions} />
        <ListBlock title="Missing Evidence" items={e.missingEvidence} />
      </div>
    </SectionCard>
  );
}

function ClosureSection({ matter }: { matter: MockMatter }) {
  if (!matter.closure) return null;
  return (
    <SectionCard title="Closure">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Closure Reason" value={matter.closure.reason} />
        <Field label="Disposal Date" value={formatMockDate(matter.closure.disposalDate)} />
        <Field label="Final Outcome" value={matter.closure.finalOutcome} />
        <Field label="Pending Obligations" value={matter.closure.pendingObligations} />
        <Field label="Appeal / Review Status" value={matter.closure.appealOrReviewStatus} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] pt-2 border-t border-[#F4EEE0]">
        Read-only — this Matter Register is closed and cannot be deleted.
      </p>
    </SectionCard>
  );
}

function MatterDetailContent() {
  const params = useParams();
  const matterId = params.matterId as string;
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = React.useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : 'overview');
  const [notice, setNotice] = React.useState<string | null>(null);
  const today = todayIso();

  const matter = getMockMatterById(matterId);

  if (!matter) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center space-y-4">
        <p className="text-sm font-bold text-[#111111]">Matter Register not found.</p>
        <Link href="/dashboard/matters" className="inline-block text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
          ← Back to Matter Registers
        </Link>
      </div>
    );
  }

  const isClosed = matter.status === 'Closed';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-12 space-y-6">
      <Link href="/dashboard/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F] transition-colors">
        ← Back to Matter Registers
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F]">{SYNTHETIC_DATA_NOTICE}</p>
        <h1 className="text-lg md:text-2xl font-black text-[#111111] mt-1">{matter.title}</h1>
      </div>

      {notice && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Header summary */}
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Case Number" value={matter.caseNumber} />
        <Field label="Court / Bench" value={matter.court} />
        <Field label="Represented Party" value={matter.representedParty} />
        <Field label="Procedural Role" value={matter.procedureRole} />
        <Field label="Matter Status" value={matter.status} />
        <Field label="Current Stage" value={matter.stage} />
        <Field label="Next Hearing" value={formatMockDate(matter.nextHearingDate)} />
        <Field label="Advocate Reference" value={matter.advocateReferenceNumber} />
        {matter.earlierCaseReference && (
          <Field label="Earlier Case Reference" value={matter.earlierCaseReference.caseNumber} />
        )}
      </div>

      {/* Primary actions */}
      <div className="flex flex-wrap gap-2">
        {isClosed ? (
          <>
            <button onClick={() => setActiveTab('overview')} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
              View Record
            </button>
            <button
              onClick={() => setNotice('Print / Export is a prototype action — no file is generated in this demonstration.')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all"
            >
              Print / Export
            </button>
            <button
              onClick={() => setNotice('Reopen Matter is a prototype action — status changes are not persisted in this demonstration.')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all"
            >
              Reopen Matter
            </button>
          </>
        ) : (
          <>
            <Link href="/prototypes/draft-document" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
              Draft Document
            </Link>
            <Link href="/prototypes/draft-document" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
              Upload Document
            </Link>
            <Link href="/prototypes/next-hearing-stage" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
              Update Hearing &amp; Stage
            </Link>
            <button onClick={() => setActiveTab('arguments')} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
              Prepare Arguments &amp; Evidence
            </button>
            <button
              onClick={() => setNotice('Close Matter is a prototype action — this demonstration record is not persisted, so it will not actually close.')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-200 text-red-700 hover:bg-red-50 bg-white transition-all"
            >
              Close Matter
            </button>
          </>
        )}
      </div>

      {/* Compact tab navigation — horizontally scrollable on mobile, no page-level overflow */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div role="tablist" className="flex gap-1.5 whitespace-nowrap border-b border-[#E7DFC9] pb-0 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === t.id ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-transparent text-[#B0A588] hover:text-[#8A7A56]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <OverviewTab matter={matter} today={today} />
            {isClosed && <ClosureSection matter={matter} />}
          </div>
        )}
        {activeTab === 'documents' && <DocumentsTab matter={matter} onNotice={setNotice} />}
        {activeTab === 'proceedings' && <ProceedingsTab matter={matter} />}
        {activeTab === 'timeline' && <TimelineTab matter={matter} />}
        {activeTab === 'tasks' && <TasksTab matter={matter} />}
        {activeTab === 'research' && <ResearchTab matter={matter} />}
        {activeTab === 'parties' && <PartiesTab matter={matter} />}
        {activeTab === 'arguments' && <ArgumentsTab matter={matter} />}
        {activeTab === 'evidence' && <EvidenceTab matter={matter} />}
      </div>
    </div>
  );
}

export default function MatterDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      }
    >
      <MatterDetailContent />
    </Suspense>
  );
}
