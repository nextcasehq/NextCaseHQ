import React from "react";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import CourtStatusWizard from "@/components/ecourts/CourtStatusWizard";

const title = "eCourts Verification | NextCaseHQ";
const description =
  "How NextCaseHQ helps you verify a case against the official eCourts record — a manual, advocate-confirmed check that never collects your eCourts credentials.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ecourts-verification" },
  openGraph: {
    title,
    description,
    url: "/ecourts-verification",
    siteName: "NextCaseHQ",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const STEPS = [
  {
    step: "01",
    title: "Search",
    body: "Enter the case number and year for the matter you want to check — or its CNR number, if you already have one.",
  },
  {
    step: "02",
    title: "Open on eCourts",
    body: "NextCaseHQ opens the official eCourts portal directly. You complete the search and any CAPTCHA yourself — nothing here is automated on your behalf.",
  },
  {
    step: "03",
    title: "Confirm",
    body: "Review what you found on eCourts, then confirm it. Nothing changes in your Matter Register until you review and approve it.",
  },
];

const INFO_NEEDED = [
  "State and district",
  "Court / establishment",
  "Case type (e.g. Civil Suit, Writ Petition, Criminal Miscellaneous Petition)",
  "Case number and year — or a 16-character CNR number",
];

export default function ECourtsVerificationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] font-sans text-[#241E17] selection:bg-[#8A6D2F] selection:text-white">
      {/* No <main> here: the root layout (app/layout.tsx) already wraps
          every route's children in the page's one <main> landmark. */}
      <div className="flex-1">
        <section className="border-b border-[#F4EEE0] bg-white">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center md:px-12 md:py-24">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A6D2F]">
              eCourts Verification
            </span>
            <h1 className="mt-3 text-balance font-serif text-3xl font-black tracking-tight text-[#241E17] md:text-5xl">
              Verify a case against the official eCourts record
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-[#5C5340]">
              A manual, advocate-confirmed check — never a credential-based
              login. You search and confirm; the official eCourts portal does
              the rest.
            </p>
          </div>
        </section>

        <section className="bg-[#FBF8F1]">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-12 lg:py-20">
            <h2 className="text-center font-serif text-2xl font-black tracking-tight text-[#241E17] md:text-3xl">
              How it works
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step} className="relative rounded-2xl border border-[#D9CDB2] bg-[#F4EEE0] p-8">
                  <span className="font-serif text-4xl font-black text-[#8A6D2F]/30">{item.step}</span>
                  <h3 className="mt-4 font-serif text-xl font-bold tracking-tight text-[#241E17]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C5340]">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto w-full max-w-3xl px-6 py-16 md:px-12 lg:py-20">
            <h2 className="font-serif text-2xl font-black tracking-tight text-[#241E17] md:text-3xl">
              What you&rsquo;ll need
            </h2>
            <ul className="mt-6 space-y-3">
              {INFO_NEEDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#5C5340]">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[#8A6D2F]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-[#8A7A56]">
              NextCaseHQ never asks for, stores, or transmits your eCourts
              username or password — only the case details above, so it can
              open the right search on the official portal.
            </p>
          </div>
        </section>

        <section className="bg-[#FBF8F1]">
          <div className="mx-auto w-full max-w-xl px-6 py-16 md:px-12 lg:py-20">
            <h2 className="font-serif text-2xl font-black tracking-tight text-[#241E17] md:text-3xl">
              Start a verification
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5340]">
              Select your State, then District, then Court Establishment —
              the same steps you&rsquo;d use on the official portal, one at a
              time.
            </p>
            <div className="mt-8">
              <CourtStatusWizard />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
