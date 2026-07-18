import React from 'react';

export default function SystemOperations() {
  const operations = [
    { name: "Clear Redis Query & Context Caches", size: "34.2 MB freed", type: "Redis" },
    { name: "Run Cryptographic Ledger Consistency Check", size: "0 errors detected", type: "KMS" },
    { name: "Trigger Automated Architecture Compliance Audit", size: "Clean render state verified", type: "Sentinel" }
  ];

  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Platform Operations Control</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Force system state maintenance tasks, execute structural cache flushes, and trigger live sentinel evaluations.</p>
      </div>

      <div className="space-y-4">
        {operations.map((op, idx) => (
          <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#F4EEE0] rounded-xl gap-4 hover:border-[#E7DFC9] transition-colors">
            <div>
              <p className="text-sm font-bold text-[#111111]">{op.name}</p>
              <p className="text-xs text-[#B0A588] font-serif italic mt-0.5">Category: {op.type} • Status: Ready</p>
            </div>
            <button className="bg-[#111111] hover:bg-[#3A3222] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors self-start md:self-auto">
              Execute Task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
