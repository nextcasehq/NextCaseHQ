import React from "react";
import Link from "next/link";

/**
 * Mirrors the wording already used in the dashboard's eCourts workflow
 * (app/dashboard/matters/ecourts.tsx) rather than importing it directly —
 * that module is a 'use client' dashboard component, and this section has
 * no functional reason to couple the marketing bundle to it.
 */
const ECOURTS_DISCLAIMER =
  "eCourts information is provided for reference. Verify critical information against the relevant court record before acting.";
const ECOURTS_ATTRIBUTION = "External official service operated by the eCommittee / NIC.";

const POINTS = [
  {
    title: "No credentials, ever",
    body: "NextCaseHQ never asks for, stores, or transmits your eCourts username or password. There is no login form for the official portal here, because there is no legitimate way for us to hold one.",
  },
  {
    title: "No scraping, no undocumented APIs",
    body: "Every case check opens the real eCourts portal directly in your browser. NextCaseHQ never scrapes results, bypasses CAPTCHA, or calls undocumented endpoints on your behalf.",
  },
  {
    title: "Manual, advocate-confirmed verification",
    body: "You check the case status yourself on eCourts, then confirm what changed. Nothing updates in your Matter Register until you review and approve it.",
  },
];

const STATUS_ROWS = [
  { label: "Credential storage", value: "None held" },
  { label: "Data source", value: "Official eCourts portal" },
  { label: "Automation", value: "Manual, advocate-confirmed" },
  { label: "CAPTCHA handling", value: "Completed on eCourts only" },
];

export default function ECourtsConnection() {
  return (
    <section id="ecourts-connection" className="bg-[#FBF8F1]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 md:px-12 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A6D2F]">
            eCourts Connection
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-black tracking-tight text-[#241E17] md:text-4xl">
            Official case data, without ever holding your eCourts login
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-[#5C5340]">
            NextCaseHQ connects every matter to the official eCourts record the
            same way a diligent advocate already does — by checking it
            directly. We built it this way on purpose.
          </p>

          <dl className="mt-10 flex flex-col gap-6">
            {POINTS.map((point) => (
              <div key={point.title} className="flex gap-4">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE6CE] text-[#8A6D2F]"
                  aria-hidden="true"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <dt className="font-serif text-base font-bold text-[#241E17]">{point.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#5C5340]">{point.body}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/ecourts-verification"
              className="inline-flex items-center gap-2 rounded-xl border border-[#8A6D2F]/50 bg-white px-6 py-3 text-sm font-bold text-[#6F5624] transition-all duration-200 hover:bg-[#8A6D2F]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2"
            >
              Start eCourts Verification
            </Link>
            <p className="max-w-[16rem] text-xs leading-relaxed text-[#8A7A56]">
              Explains what&rsquo;s needed, then opens your Matter Register —
              verification itself always happens on the official eCourts
              portal.
            </p>
          </div>
        </div>

        {/* Visual: connection status panel, mirroring the Security section's
            envelope-status card so the two trust panels read as one family. */}
        <div className="relative">
          <div className="rounded-2xl border border-[#D9CDB2] bg-white p-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#8A7A56]">
                Connection status
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#EFE6CE] px-3 py-1 text-xs font-bold text-[#6F5624]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8A6D2F]" aria-hidden="true" />
                Manual verification
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-3 font-mono text-sm">
              {STATUS_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#D9CDB2] bg-[#FBF8F1] px-4 py-3"
                >
                  <span className="text-[#8A7A56]">{row.label}</span>
                  <span className="text-right text-[#3A3222]">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-[#8A7A56]">{ECOURTS_DISCLAIMER}</p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-[#B0A588]">{ECOURTS_ATTRIBUTION}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
