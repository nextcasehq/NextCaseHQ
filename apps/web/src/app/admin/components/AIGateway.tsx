import React from 'react';

export default function AIGateway() {
  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">AI Inference Gateway</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Control pipeline rates, configure context window allocation, and view Indian PII scrubbing logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">LLM Proxy Controllers</h4>
          <p className="text-xs text-[#B0A588]">Current Default Model: <code>Claude 3.5 Sonnet v2</code></p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#5C5340]">
              <span>Token Consumption Rate Limit</span>
              <span>45,000 / min</span>
            </div>
            <div className="w-full bg-[#F4EEE0] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#8A6D2F] h-full w-[40%]"></div>
            </div>
          </div>
        </div>

        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">PII Ingestion Filter State</h4>
          <p className="text-xs text-[#B0A588]">Indian PAN/Aadhaar scrubbing is fully active at edge API controllers.</p>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-emerald-700">ACTIVE: Edge Regex Filtration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
