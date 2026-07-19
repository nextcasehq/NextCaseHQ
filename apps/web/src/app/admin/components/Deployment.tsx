import React from 'react';

export default function Deployment() {
  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Continuous Deployment Status</h3>
        <p className="text-sm text-[#726B58] font-serif italic mt-0.5">Vercel deployments sync status, GitHub webhook integrations, and branch version maps.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">Production State Synchronization</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#5C5340]">
              <span>Local Workspace Branch</span>
              <span className="font-mono">feat/ci-cd-governance-pipeline</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-[#5C5340]">
              <span>Production Branch</span>
              <span className="font-mono text-emerald-600">main</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-[#5C5340]">
              <span>Sync State Status</span>
              <span className="text-[#8A6D2F] font-black">SYNCED</span>
            </div>
          </div>
        </div>

        <div className="p-5 border border-[#F4EEE0] rounded-xl space-y-3">
          <h4 className="font-bold text-sm text-[#111111]">Vercel Deploy Pipeline</h4>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-700">ONLINE: Live Ingress Routing Configured</span>
          </div>
          <p className="text-[11px] text-[#726B58]">Any push to <code>main</code> triggers automated build, test coverage verification, and live rollout.</p>
        </div>
      </div>
    </div>
  );
}
