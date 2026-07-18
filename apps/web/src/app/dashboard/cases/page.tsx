'use client';

import React, { useState, useEffect } from 'react';

interface CaseItem {
  id: string;
  title: string;
  status: string;
  court: string;
  jurisdiction: 'IN' | 'US' | 'UK';
}

export default function CasesPage() {
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('NEXTCASE_CURRENT_TENANT_ID_CONTEXT');
      setTenantId(stored || 'tenant-default-01');
    }
  }, []);
  const [cases, setCases] = useState<CaseItem[]>([
    { id: 'LD-2026-0041', title: 'State of Maharashtra v. K. R. Sharma', status: 'HEARING_REMINDER', court: 'Delhi High Court', jurisdiction: 'IN' },
    { id: 'LD-2026-0182', title: 'Fraser Inc. v. Sterling Commerce', status: 'CRITICAL_LIMITATION_DEADLINE', court: 'S.D.N.Y. Federal Court', jurisdiction: 'US' },
    { id: 'LD-2026-0095', title: 'Harrods Ltd v. Westminster Corp', status: 'INVOICE_SETTLED', court: 'London Commercial Court', jurisdiction: 'UK' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCaseClick = (c: CaseItem) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('NEXTCASE_CURRENT_CASE_CONTEXT', JSON.stringify(c));
      window.location.href = '/dashboard';
    }
  };
  const [newTitle, setNewTitle] = useState('');
  const [newCourt, setNewCourt] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState<'IN' | 'US' | 'UK'>('IN');
  const [newStatus, setNewStatus] = useState('ACTIVE_LITIGATION');

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewTitle('');
    setNewCourt('');
    setNewJurisdiction('IN');
    setNewStatus('ACTIVE_LITIGATION');
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCourt.trim()) return;

    const randomId = `LD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase: CaseItem = {
      id: randomId,
      title: newTitle,
      court: newCourt,
      jurisdiction: newJurisdiction,
      status: newStatus,
    };

    setCases([newCase, ...cases]);
    handleCloseModal();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-[#111111]/10 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Active Litigation Portfolios</h1>
          <p className="text-xs font-semibold text-[#B0A588] uppercase tracking-widest mt-1">
            Active Tenant Context: <span className="font-mono text-[#8A6D2F]">{tenantId.slice(0, 8)}...</span>
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-6 py-3 bg-[#111111] text-[#FDFBF7] text-xs uppercase tracking-wider font-bold rounded shadow hover:bg-[#111111]/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          + Open New Case
        </button>
      </div>

      {/* Case List Grid */}
      <div className="space-y-4">
        {cases.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCaseClick(c)}
            className="w-full text-left p-6 border border-[#111111]/10 rounded bg-white flex justify-between items-center hover:border-[#111111] hover:shadow-sm transition-all group cursor-pointer block"
          >
            <div>
              <span className="text-[10px] font-mono border border-[#111111]/10 bg-[#111111]/5 text-[#111111]/70 px-2 py-0.5 rounded uppercase tracking-wider mr-2">
                {c.id}
              </span>
              <span className="text-xs font-bold text-[#111111]/40 uppercase tracking-widest">
                {c.court} // {c.jurisdiction}
              </span>
              <h3 className="font-bold text-lg text-[#111111] mt-2 group-hover:text-[#8A6D2F] transition-colors">
                {c.title}
              </h3>
            </div>
            <span className="px-3 py-1.5 border border-[#111111]/10 rounded text-[10px] font-mono uppercase tracking-wider bg-[#111111]/5">
              {c.status}
            </span>
          </button>
        ))}
      </div>

      {/* High-Fidelity Case Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] w-full max-w-lg border border-[#111111]/20 rounded p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black uppercase tracking-wider text-[#111111] border-b border-[#111111]/10 pb-4 mb-6">
              Create Litigation Case
            </h2>

            <form onSubmit={handleCreateCase} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
                  Case Title / Caption
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fraser Inc. v. Sterling Commerce"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
                  Forum / Court Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S.D.N.Y. Federal Court"
                  value={newCourt}
                  onChange={(e) => setNewCourt(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-sm font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
                    Jurisdiction Pack
                  </label>
                  <select
                    value={newJurisdiction}
                    onChange={(e) => setNewJurisdiction(e.target.value as 'IN' | 'US' | 'UK')}
                    className="w-full px-3 py-3 bg-white border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-sm font-sans"
                  >
                    <option value="IN">India (BNS & BNSS Compliance)</option>
                    <option value="US">United States (FRCP Compliance)</option>
                    <option value="UK">United Kingdom (CPR Compliance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
                    Initial Case Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-3 bg-white border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-sm font-sans"
                  >
                    <option value="ACTIVE_LITIGATION">Active Litigation</option>
                    <option value="HEARING_REMINDER">Hearing Reminder</option>
                    <option value="CRITICAL_LIMITATION_DEADLINE">Critical Deadline</option>
                    <option value="DISCOVERY_PHASE">Discovery Phase</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#111111]/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-3 border border-[#111111]/15 text-[#111111] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#111111]/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#111111] text-[#FDFBF7] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#111111]/90 active:scale-[0.98] transition-all"
                >
                  Open Matter Context
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
