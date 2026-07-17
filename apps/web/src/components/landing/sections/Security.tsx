import React from "react";

const POINTS = [
  {
    title: "Client-side pre-encryption",
    body: "Files and transcripts are encrypted in your browser before upload. Plaintext never touches our infrastructure.",
  },
  {
    title: "Hardware-backed key management",
    body: "Envelope keys are wrapped by a hardware-backed KMS. NextCaseHQ operates a true zero-knowledge shell—we cannot read your data.",
  },
  {
    title: "Tenant isolation by default",
    body: "Row-level security and strict tenant boundaries keep every chamber's matters cryptographically and logically separated.",
  },
];

export default function Security() {
  return (
    <section className="border-y border-neutral-200/70 bg-[#111111] text-[#FDFBF7]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 md:px-12 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            Security architecture
          </span>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-4xl">
            Confidentiality that holds up in court and in code
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-neutral-300">
            NextCaseHQ is built zero-knowledge from the ground up. Privilege and
            confidentiality are enforced by cryptography, not just policy.
          </p>

          <dl className="mt-10 flex flex-col gap-6">
            {POINTS.map((point) => (
              <div key={point.title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white" aria-hidden="true">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <dt className="text-base font-bold">{point.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-neutral-400">{point.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual: layered encryption panel */}
        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Envelope status
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Encrypted
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-3 font-mono text-sm">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-neutral-400">Document key</span>
                <span className="text-neutral-200">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-neutral-400">Wrapped by</span>
                <span className="text-neutral-200">KMS · HSM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-neutral-400">Server access</span>
                <span className="text-indigo-400">Ciphertext only</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-neutral-400">Audit entry</span>
                <span className="text-neutral-200">Ledger #48291</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
