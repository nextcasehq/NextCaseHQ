import React from 'react';

export default function AIGateway() {
  return (
    <div className="space-y-6 bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">AI Inference Gateway</h3>
        <p className="text-sm text-neutral-400 font-serif italic mt-0.5">Control pipeline rates, configure context window allocation, and view Indian PII scrubbing logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 border border-neutral-100 rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">LLM Proxy Controllers</h4>
          <p className="text-xs text-neutral-400">Current Default Model: <code>Claude 3.5 Sonnet v2</code></p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-neutral-600">
              <span>Token Consumption Rate Limit</span>
              <span>45,000 / min</span>
            </div>
            <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[40%]"></div>
            </div>
          </div>
        </div>

        <div className="p-5 border border-neutral-100 rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">PII Ingestion Filter State</h4>
          <p className="text-xs text-neutral-400">Indian PAN/Aadhaar scrubbing is fully active at edge API controllers.</p>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-emerald-700">ACTIVE: Edge Regex Filtration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
