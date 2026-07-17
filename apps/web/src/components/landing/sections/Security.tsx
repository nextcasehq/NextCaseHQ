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
    <section className="border-y border-[#0A1B14] bg-[#0E241B] text-[#F6F1E7]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 md:px-12 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E4C77E]">
            Security architecture
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-black tracking-tight md:text-4xl">
            Confidentiality that holds up in court and in code
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-[#CFC3A8]">
            NextCaseHQ is built zero-knowledge from the ground up. Privilege and
            confidentiality are enforced by cryptography, not just policy.
          </p>

          <dl className="mt-10 flex flex-col gap-6">
            {POINTS.map((point) => (
              <div key={point.title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8A6D2F] text-[#F6F1E7]" aria-hidden="true">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <dt className="font-serif text-base font-bold">{point.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#B0A588]">{point.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual: layered encryption panel */}
        <div className="relative">
          <div className="rounded-2xl border border-[#C6A253]/20 bg-[#0B1F17]/60 p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">
                Envelope status
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#C6A253]/15 px-3 py-1 text-xs font-bold text-[#E4C77E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E4C77E]" aria-hidden="true" />
                Encrypted
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-3 font-mono text-sm">
              <div className="flex items-center justify-between rounded-lg border border-[#C6A253]/15 bg-black/20 px-4 py-3">
                <span className="text-[#B0A588]">Document key</span>
                <span className="text-[#E7DFC9]">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#C6A253]/15 bg-black/20 px-4 py-3">
                <span className="text-[#B0A588]">Wrapped by</span>
                <span className="text-[#E7DFC9]">KMS · HSM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#C6A253]/15 bg-black/20 px-4 py-3">
                <span className="text-[#B0A588]">Server access</span>
                <span className="text-[#E4C77E]">Ciphertext only</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#C6A253]/15 bg-black/20 px-4 py-3">
                <span className="text-[#B0A588]">Audit entry</span>
                <span className="text-[#E7DFC9]">Ledger #48291</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
