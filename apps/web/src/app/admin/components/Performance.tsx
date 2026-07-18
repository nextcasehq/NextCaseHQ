import React from 'react';

export default function Performance() {
  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Platform Performance Budgets</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Interaction to Next Paint (INP), Edge API Gateway latencies, and first layout paint times.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-2">
          <p className="text-[11px] font-bold text-[#B0A588] uppercase tracking-wide">Interaction to Next Paint (INP)</p>
          <p className="text-2xl font-black text-emerald-600">11ms</p>
          <p className="text-[11px] text-[#B0A588]">Budget limit: &lt; 15ms</p>
        </div>

        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-2">
          <p className="text-[11px] font-bold text-[#B0A588] uppercase tracking-wide">Edge API Gate Response</p>
          <p className="text-2xl font-black text-emerald-600">1.84ms</p>
          <p className="text-[11px] text-[#B0A588]">Budget limit: &lt; 5ms</p>
        </div>

        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-2">
          <p className="text-[11px] font-bold text-[#B0A588] uppercase tracking-wide">First Contentful Paint (FCP)</p>
          <p className="text-2xl font-black text-emerald-600">0.24s</p>
          <p className="text-[11px] text-[#B0A588]">Budget limit: &lt; 1.0s</p>
        </div>
      </div>
    </div>
  );
}
