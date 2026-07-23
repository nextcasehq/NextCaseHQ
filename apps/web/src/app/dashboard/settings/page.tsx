'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [provider, setProvider] = useState<'CloudKMSProvider' | 'LocalSubtleCrypto' | 'HSMHardwareKey'>('CloudKMSProvider');
  const [activePacks, setActivePacks] = useState<string[]>(['IN', 'US', 'UK']);
  const [latencyBudget, setLatencyBudget] = useState(15);
  const [isSaved, setIsSaved] = useState(false);

  const togglePack = (pack: string) => {
    if (activePacks.includes(pack)) {
      setActivePacks(activePacks.filter((p) => p !== pack));
    } else {
      setActivePacks([...activePacks, pack]);
    }
  };

  const handleSaveSettings = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Settings Title */}
      <div className="border-b border-[#111111]/10 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">System Settings & Config</h1>
          <p className="text-sm font-serif italic text-[#111111]/60">Cryptographic key providers, OTel telemetry, and regional controls.</p>
        </div>
        {isSaved && (
          <span className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded uppercase font-bold tracking-wider animate-bounce">
            Settings Saved
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Cryptographic Key Management Configuration */}
        <div className="p-6 border border-[#111111]/10 rounded bg-white space-y-4">
          <h2 className="font-bold text-lg text-[#111111]">Cryptographic Key Management</h2>
          <p className="text-xs text-[#111111]/70 font-serif italic">Define the secure hardware key provider wrapping active tenant DEKs.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {[
              { id: 'CloudKMSProvider', name: 'Google Cloud KMS Provider' },
              { id: 'LocalSubtleCrypto', name: 'W3C SubtleCrypto Fallback' },
              { id: 'HSMHardwareKey', name: 'HSM Hardware Key Module' }
            ].map((prov) => (
              <button
                key={prov.id}
                onClick={() => setProvider(prov.id as any)}
                className={`p-4 text-xs font-bold uppercase tracking-wider rounded border text-left transition-all ${
                  provider === prov.id
                    ? 'border-[#111111] bg-[#111111]/5 text-[#111111]'
                    : 'border-[#111111]/10 bg-transparent text-[#111111]/70 hover:bg-[#111111]/2'
                }`}
              >
                <span className="block opacity-40 text-[9px] mb-1">PROVIDER ID</span>
                {prov.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-mono text-[#111111]/70 pt-2">
            ACTIVE PROVIDER: {provider} // CIRCUIT_BREAKER_STATUS: STABLE
          </p>
        </div>

        {/* Regional Jurisdictional Packs */}
        <div className="p-6 border border-[#111111]/10 rounded bg-white space-y-4">
          <h2 className="font-bold text-lg text-[#111111]">Regional Jurisdictional Packs</h2>
          <p className="text-xs text-[#111111]/70 font-serif italic">Enable or disable regional litigation telemetry validation templates (e.g. India BNSS/BNS).</p>

          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { code: 'IN', title: 'India (BNS & BNSS Compliance)' },
              { code: 'US', title: 'United States (FRCP Compliance)' },
              { code: 'UK', title: 'United Kingdom (CPR Compliance)' }
            ].map((pack) => {
              const isActive = activePacks.includes(pack.code);
              return (
                <button
                  key={pack.code}
                  onClick={() => togglePack(pack.code)}
                  className={`px-5 py-3 text-xs font-bold uppercase tracking-wider rounded border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'border-[#111111] bg-[#111111] text-[#FDFBF7]'
                      : 'border-[#111111]/10 bg-transparent text-[#111111]/70 hover:text-[#111111]'
                  }`}
                >
                  <span>{isActive ? '✓' : '✗'}</span>
                  <span>{pack.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Latency Threshold Budgets */}
        <div className="p-6 border border-[#111111]/10 rounded bg-white space-y-4">
          <h2 className="font-bold text-lg text-[#111111]">OpenTelemetry Performance Budgets</h2>
          <p className="text-xs text-[#111111]/70 font-serif italic">Set milliseconds speed limit alert boundaries. Alerts fire if API times exceed budget.</p>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-xs font-mono text-[#111111]/60">
              <span>Edge Middleware Target Budget</span>
              <span>{latencyBudget} ms</span>
            </div>
            <input
              type="range"
              aria-label="Edge Middleware Target Budget (milliseconds)"
              min={5}
              max={50}
              value={latencyBudget}
              onChange={(e) => setLatencyBudget(Number(e.target.value))}
              className="w-full accent-[#111111] bg-[#111111]/10 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="px-8 py-4 bg-[#111111] hover:bg-[#111111]/90 text-[#FDFBF7] font-bold text-xs uppercase tracking-widest rounded shadow transition-all active:scale-[0.98]"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
