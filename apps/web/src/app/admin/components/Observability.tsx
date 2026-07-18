import React from 'react';

export default function Observability() {
  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Telemetry & Log Stream</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Live OpenTelemetry dashboard indicators, trace routes, and edge runtime performance budgets.</p>
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-sm text-[#111111]">Real-time Event Ingestion Stream</h4>
        <div className="bg-[#241E17] text-[#CFC3A8] font-mono text-xs p-4 rounded-xl space-y-2 max-h-48 overflow-y-auto shadow-inner">
          <div className="text-[#8A7A56]">[2026-07-15 18:42:01] INF: Initialized crypto envelope provider</div>
          <div className="text-emerald-400">[2026-07-15 18:42:12] INF: Row-Level Security isolation check complete for tenant 0000a</div>
          <div className="text-[#8A7A56]">[2026-07-15 18:42:15] INF: Stream chunk validation - 202 Accepted</div>
          <div className="text-[#C6A253]">[2026-07-15 18:42:18] INF: Context assembly pipeline initiated - PII scrubbing enabled</div>
        </div>
      </div>
    </div>
  );
}
