import React from 'react';

export default function Settings() {
  return (
    <div className="space-y-6 bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Platform Security Config</h3>
        <p className="text-sm text-neutral-400 font-serif italic mt-0.5">Toggle live debugging logs, audit trails, secure cookie attributes, and key encryption parameters.</p>
      </div>

      <div className="space-y-4">
        {[
          { title: "Enable Real-time Debug Log Outputs", desc: "Forwards verbose debug traces to GHA validation logs." },
          { title: "Enforce Row-Level Security", desc: "Mandates tenant cookie mapping checks on all Edge controllers." },
          { title: "Enforce India PII Scrubbing Rules", desc: "Automatically scrub Indian PAN and Aadhaar formats in payloads." }
        ].map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-4 border border-neutral-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-[#111111]">{item.title}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
            </div>
            <div className="w-12 h-6 bg-indigo-600 rounded-full p-1 flex items-center justify-end cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
