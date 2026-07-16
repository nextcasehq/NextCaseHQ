'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { LitigationDb, Matter, Case } from '@/lib/db/litigation-db';

export default function MatterDetailsChamberPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [matter, setMatter] = useState<Matter | undefined>(undefined);
  const [cases, setCases] = useState<Case[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [practiceArea, setPracticeArea] = useState('');
  const [advocate, setAdvocate] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    const fetchedMatter = LitigationDb.getMatter(id);
    if (fetchedMatter) {
      setMatter(fetchedMatter);
      setCases(LitigationDb.getCasesForMatter(id));

      // Populating edits
      setClientName(fetchedMatter.clientName);
      setTitle(fetchedMatter.title);
      setPracticeArea(fetchedMatter.practiceArea);
      setAdvocate(fetchedMatter.advocateInCharge);
      setDescription(fetchedMatter.description);
      setTagsInput(fetchedMatter.tags.join(', '));
    }
  }, [id]);

  if (!matter) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Matter Not Found</h2>
          <p className="text-xs text-neutral-400 mt-1">This matter ID does not exist or you lack multi-tenant RLS clearance.</p>
          <Link href="/matters" className="mt-4 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:underline">
            Back to Matters
          </Link>
        </main>
      </div>
    );
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const updated = LitigationDb.updateMatter(id, {
      clientName,
      title,
      practiceArea,
      advocateInCharge: advocate,
      description,
      tags
    });
    if (updated) {
      setMatter(updated);
      setIsEditing(false);
    }
  };

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this litigation matter?')) {
      LitigationDb.archiveMatter(id);
      const updated = LitigationDb.getMatter(id);
      setMatter(updated);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/matters" className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
            ← Back to Matters Chamber
          </Link>
        </div>

        {/* Matter Title Card */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {matter.id}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                {matter.jurisdiction} PACK
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                matter.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                matter.status === 'ARCHIVED' ? 'bg-neutral-100 text-neutral-600 border border-neutral-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {matter.status}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">
              {matter.title}
            </h1>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
              CLIENT: <span className="text-neutral-600 font-sans">{matter.clientName}</span>
            </p>
          </div>

          <div className="flex gap-3 self-start md:self-auto">
            {matter.status === 'ACTIVE' && (
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-red-200"
              >
                Archive Matter
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              {isEditing ? 'Cancel Edits' : 'Edit Matter Details'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details and Editing */}
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Edit Matter Form</h3>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Matter Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Client Name</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Practice Area</label>
                    <input
                      type="text"
                      value={practiceArea}
                      onChange={(e) => setPracticeArea(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Advocate in Charge</label>
                    <input
                      type="text"
                      value={advocate}
                      onChange={(e) => setAdvocate(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium font-sans"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-neutral-200 text-neutral-500 text-xs font-bold uppercase rounded-lg hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow"
                    >
                      Save Updates
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Matter Description Overview</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed font-medium whitespace-pre-line">
                    {matter.description || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-neutral-100 pt-6">
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">PRACTICE AREA</span>
                    <span className="text-sm font-bold text-neutral-800">{matter.practiceArea}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ADVOCATE IN CHARGE</span>
                    <span className="text-sm font-bold text-neutral-800">{matter.advocateInCharge}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">DATE INTIATED</span>
                    <span className="text-xs font-mono text-neutral-600">{new Date(matter.createdDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">LAST UPDATED</span>
                    <span className="text-xs font-mono text-neutral-600">{new Date(matter.updatedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-6">
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">MATTER LABELS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {matter.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-neutral-50 text-neutral-500 border border-neutral-100 px-2 py-0.5 rounded-md font-semibold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Linked Cases Workspace Area */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Linked Case Workspaces</h3>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">{cases.length} CASE CORES ASSIGNED</span>
                </div>
                <Link
                  href={`/cases?preMatterId=${matter.id}`}
                  className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-indigo-600 hover:text-indigo-700 font-bold text-xs px-4 py-2 rounded-lg transition-all uppercase tracking-wider"
                >
                  Create Case Inside Matter
                </Link>
              </div>

              {cases.length > 0 ? (
                <div className="space-y-4">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 border border-neutral-100 rounded-xl bg-neutral-50/50 hover:border-indigo-100 hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {c.id}
                          </span>
                          <span className="text-xs font-bold text-neutral-500">{c.court}</span>
                        </div>
                        <h4 className="font-bold text-sm text-neutral-800">{c.title}</h4>
                        <p className="text-xs text-neutral-400 font-mono mt-1">Stage: {c.stage}</p>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                        <div className="text-right">
                          <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">NEXT HEARING</span>
                          <span className="text-xs font-mono font-bold text-neutral-700">{c.hearingDate}</span>
                        </div>
                        <Link
                          href={`/cases/${c.id}`}
                          className="px-3.5 py-1.5 border border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-lg uppercase tracking-wider transition-all"
                        >
                          Workspace →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-neutral-50/50 border border-neutral-100 rounded-xl">
                  <span className="text-2xl">⚖️</span>
                  <p className="text-xs font-semibold text-neutral-500 mt-2">No litigation cases bound to this matter.</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Click the button above to spawn a new litigation case.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Action Context */}
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Litigation Audit Actions</h3>
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full py-3 bg-neutral-100 text-neutral-400 font-bold text-xs uppercase tracking-wider rounded-lg border border-neutral-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🔒 Lock Matter Ledger
                </button>
                <button
                  disabled
                  className="w-full py-3 bg-neutral-100 text-neutral-400 font-bold text-xs uppercase tracking-wider rounded-lg border border-neutral-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  📄 Compliance Check (BNSS)
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 italic text-center mt-3">
                Blockchain-backed immutable logging active on this tenant partition.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
