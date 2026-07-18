'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LitigationDb, Matter } from '@/lib/db/litigation-db';

export default function MattersChamberPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPractice, setSelectedArea] = useState<string>('ALL');

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [practiceArea, setPracticeArea] = useState('Constitutional Law');
  const [jurisdiction, setJurisdiction] = useState('IN');
  const [advocate, setAdvocate] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    // Read tenant ID from context
    setTenantId(LitigationDb.getTenantId());
    setMatters(LitigationDb.getMatters());
  }, []);

  const handleRefresh = () => {
    setMatters(LitigationDb.getMatters());
  };

  const handleCreateMatter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !title) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    LitigationDb.createMatter({
      clientName,
      title,
      practiceArea,
      jurisdiction,
      advocateInCharge: advocate,
      description,
      tags
    });

    // Reset Form
    setClientName('');
    setTitle('');
    setAdvocate('');
    setDescription('');
    setTagsInput('');
    setShowCreateForm(false);
    handleRefresh();
  };

  // Unique practice areas for filtering
  const practiceAreas = Array.from(new Set(matters.map(m => m.practiceArea)));

  // Filter & Search Logic
  const filteredMatters = matters.filter(m => {
    const matchesSearch =
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || m.status === selectedStatus;
    const matchesPractice = selectedPractice === 'ALL' || m.practiceArea === selectedPractice;

    return matchesSearch && matchesStatus && matchesPractice;
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E7DFC9]/60">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">
              Matter Management Chamber
            </h1>
            <p className="text-xs font-semibold text-[#B0A588] uppercase tracking-widest mt-1">
              Active Tenant Context: <span className="font-mono text-[#8A6D2F]">{tenantId.slice(0, 8)}...</span>
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="self-start md:self-auto bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
          >
            {showCreateForm ? 'Close Form' : 'Initiate New Matter'}
          </button>
        </div>

        {/* Matter Creation Form */}
        {showCreateForm && (
          <div className="mb-10 p-6 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm animate-fadeIn">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#B0A588] mb-4">
              New Matter Entry Form
            </h3>
            <form onSubmit={handleCreateMatter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. NextCaseHQ Technologies Inc."
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Matter Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Writ Petition (Civil) against Union of India"
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Practice Area
                </label>
                <select
                  value={practiceArea}
                  onChange={(e) => setPracticeArea(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                >
                  <option value="Constitutional Law">Constitutional Law</option>
                  <option value="Intellectual Property">Intellectual Property</option>
                  <option value="Commercial Dispute">Commercial Dispute</option>
                  <option value="Criminal Law">Criminal Law</option>
                  <option value="Corporate Governance">Corporate Governance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Jurisdiction Pack
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                >
                  <option value="IN">India (BNS & BNSS Compliance)</option>
                  <option value="US">US Federal Litigation (FRCP)</option>
                  <option value="UK">UK High Court (CPR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Advocate In Charge
                </label>
                <input
                  type="text"
                  value={advocate}
                  onChange={(e) => setAdvocate(e.target.value)}
                  placeholder="e.g. Senior Counsel Harish Salve"
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. BNSS, High Court, Patent"
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Matter Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide comprehensive overview of client representation..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222] font-sans"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#8A7A56] rounded-lg hover:bg-[#FBF8F1] transition-all"
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

        {/* Filter Section */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-8">
          <div className="w-full md:flex-1 relative flex items-center bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-1.5 focus-within:border-[#A9843F] transition-all">
            <span className="pl-3 pr-2 text-[#B0A588]">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active matters by title, client name, or ID..."
              className="w-full bg-transparent border-none outline-none text-[#111111] text-xs md:text-sm font-medium placeholder-[#B0A588] py-1.5"
            />
          </div>

          <div className="w-full md:w-auto flex flex-wrap gap-3">
            <select
              value={selectedPractice}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg text-xs font-bold text-[#4A4130] outline-none"
            >
              <option value="ALL">All Practice Areas</option>
              {practiceAreas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg text-xs font-bold text-[#4A4130] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Matters Grid */}
        {filteredMatters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {filteredMatters.map((matter) => (
              <div
                key={matter.id}
                className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                      {matter.id}
                    </span>
                    <span className="ml-2 text-[10px] font-bold text-[#B0A588] border border-[#E7DFC9] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                      {matter.jurisdiction} PACK
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    matter.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                    matter.status === 'ARCHIVED' ? 'bg-[#F4EEE0] text-[#5C5340] border border-[#E7DFC9]' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {matter.status}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#111111] group-hover:text-[#8A6D2F] transition-colors mb-1">
                  {matter.title}
                </h3>
                <p className="text-xs text-[#B0A588] font-bold uppercase tracking-wider mb-3">
                  Client: {matter.clientName}
                </p>

                <p className="text-xs text-[#8A7A56] leading-relaxed font-medium mb-4 flex-1 line-clamp-2">
                  {matter.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {matter.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-[#FBF8F1] text-[#8A7A56] border border-[#F4EEE0] px-2 py-0.5 rounded-md font-semibold">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="border-t border-[#F4EEE0] pt-4 flex items-center justify-between mt-auto">
                  <div className="text-[10px] font-mono text-[#B0A588] uppercase tracking-widest">
                    Advocate: <span className="font-sans font-bold text-[#5C5340]">{matter.advocateInCharge}</span>
                  </div>
                  <Link
                    href={`/matters/${matter.id}`}
                    className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624] flex items-center gap-1"
                  >
                    Manage Matter →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-[#E7DFC9]/80 rounded-xl">
            <span className="text-3xl">📂</span>
            <h3 className="text-base font-bold text-[#4A4130] mt-3">No Matters Found</h3>
            <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">
              No matters matching current query/filters exist inside your secure multi-tenant partition.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
