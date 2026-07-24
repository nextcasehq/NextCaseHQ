import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isProductReviewModeEnabled, matchPublicPreviewRoute } from '@/lib/beta/demo-data';

/**
 * TEMPORARY runtime diagnostics page — added only to answer one question:
 * "is the server I'm looking at actually running the code I think it is."
 * Not part of the product. Delete this whole directory once that's settled.
 *
 * Every value below is read live, at request time, from the actual running
 * process (git shelled out against the real .git on disk, package.json
 * parsed fresh, process.env / process.uptime() read directly) — nothing
 * here is a build-time constant or a hardcoded claim. If this server is
 * serving different code than expected, this page will show that honestly:
 * git commands fail if there's no .git, feature markers won't be found if
 * the file doesn't contain them, etc.
 *
 * Guarded exactly as instructed: only renders in non-production NODE_ENV or
 * when PRODUCT_REVIEW_MODE=true. Otherwise a plain 404, same as visiting
 * any other nonexistent route — no distinguishing signal for a real
 * production deployment that never wants this reachable at all.
 */

function tryGit(cmd: string): string {
  try {
    return execSync(cmd, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return `unavailable (${(e as Error).message.split('\n')[0]})`;
  }
}

function readFileSafe(relPath: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
  } catch {
    return null;
  }
}

/** Each feature is checked by looking for a marker that only exists in the
 * actual redesigned source — not a claim I'm asserting, a grep against the
 * real file on this server's disk, right now. */
function featureCheck(label: string, relPath: string, marker: string) {
  const content = readFileSafe(relPath);
  const present = content !== null && content.includes(marker);
  return { label, relPath, marker, present, fileFound: content !== null };
}

const ALLOWED_NEXT_PUBLIC_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_CLARITY_PROJECT_ID',
  'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
  'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
  'NEXT_PUBLIC_GTM_CONTAINER_ID',
  'NEXT_PUBLIC_SIMULATED_TENANT_ID',
];

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#F4EEE0] last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-[#726B58]">{k}</span>
      <span className="text-xs font-mono text-[#3A3222] text-right break-all">{v}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm mb-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-[#8A6D2F] mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function RuntimeDiagnosticsPage() {
  const guardOk = process.env.NODE_ENV !== 'production' || isProductReviewModeEnabled();
  if (!guardOk) notFound();

  const branch = tryGit('git rev-parse --abbrev-ref HEAD');
  const sha = tryGit('git rev-parse HEAD');
  const subject = tryGit('git log -1 --format=%s');
  const authoredAt = tryGit('git log -1 --format=%aI');
  const aheadBehindMain = tryGit('git rev-list --left-right --count origin/main...HEAD');
  const workingTreeStatus = tryGit('git status --porcelain');

  const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
  let buildTimestamp = 'no .next/BUILD_ID present (dev mode has no persisted build artifact)';
  try {
    const stat = fs.statSync(buildIdPath);
    buildTimestamp = stat.mtime.toISOString();
  } catch {
    // left as default message
  }

  const pkgRaw = readFileSafe('package.json');
  const appVersion = pkgRaw ? (JSON.parse(pkgRaw).version ?? 'unknown') : 'package.json not found';

  const reviewModeActive = isProductReviewModeEnabled();
  const casesResponse = matchPublicPreviewRoute('/api/cases', new URLSearchParams()) as { cases?: unknown[] } | undefined;
  const mattersResponse = matchPublicPreviewRoute('/api/matters', new URLSearchParams()) as { matters?: unknown[] } | undefined;
  const demoProceedingCount = casesResponse?.cases?.length ?? 0;
  const demoMatterCount = mattersResponse?.matters?.length ?? 0;

  const features = [
    featureCheck('Case Diary redesign', 'src/app/cases/page.tsx', "Today's Hearings"),
    featureCheck('Matter Register redesign', 'src/app/matters/page.tsx', 'rowUrgency'),
    featureCheck('Matter Workspace redesign', 'src/app/matters/[id]/page.tsx', 'At a Glance'),
    featureCheck('Activity Stream', 'src/app/matters/[id]/page.tsx', 'Matter Activity'),
    featureCheck('Court Orders aggregation', 'src/app/matters/[id]/page.tsx', 'fetchMatterOrders'),
    featureCheck('Mobile Navigation', 'src/components/PrimaryAppNavMobile.tsx', 'export function PrimaryAppNavMobile'),
    featureCheck('Draft Builder (Tiptap rebuild)', 'src/app/dashboard/draft-builder/page.tsx', 'useDocumentEditor'),
  ];

  const startupTime = new Date(Date.now() - process.uptime() * 1000);

  return (
    <div className="max-w-3xl w-full mx-auto px-6 py-10">
      <div className="mb-6 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl">
        <p className="text-xs font-bold text-[#6F5624]">
          Temporary diagnostics page. Every value below is read live from this exact running
          process — not hardcoded. Remove this route once verification is complete.
        </p>
      </div>

      <h1 className="text-xl font-black uppercase tracking-tight text-[#111111] mb-6">Runtime Diagnostics</h1>

      <Section title="Git">
        <Row k="Branch" v={branch} />
        <Row k="Commit SHA" v={sha} />
        <Row k="Commit subject" v={subject} />
        <Row k="Commit authored at" v={authoredAt} />
        <Row k="Ahead / behind origin/main" v={aheadBehindMain || '(unavailable — origin/main not fetched in this checkout)'} />
        <Row k="Working tree" v={workingTreeStatus ? `dirty:\n${workingTreeStatus}` : 'clean'} />
        <Row k="Build timestamp (.next/BUILD_ID mtime)" v={buildTimestamp} />
        <Row k="Application version (package.json)" v={appVersion} />
      </Section>

      <Section title="Environment">
        <Row k="NODE_ENV" v={process.env.NODE_ENV ?? 'unset'} />
        <Row k="PRODUCT_REVIEW_MODE" v={process.env.PRODUCT_REVIEW_MODE ?? 'unset'} />
        {ALLOWED_NEXT_PUBLIC_KEYS.map((key) => (
          <Row key={key} k={key} v={process.env[key] ?? 'not set'} />
        ))}
      </Section>

      <Section title="Feature status (grep of the real file on this server's disk, at request time)">
        {features.map((f) => (
          <div key={f.label} className="py-1.5 border-b border-[#F4EEE0] last:border-0">
            <div className="flex justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#726B58]">{f.label}</span>
              <span className={`text-xs font-black ${f.present ? 'text-green-700' : 'text-red-700'}`}>
                {f.fileFound ? (f.present ? '✓ PRESENT' : '✗ MARKER NOT FOUND') : '✗ FILE NOT FOUND'}
              </span>
            </div>
            <p className="text-[10px] text-[#B0A588] mt-0.5">
              {f.relPath} — checked for: &quot;{f.marker}&quot;
            </p>
          </div>
        ))}
      </Section>

      <Section title="Review data">
        <Row k="Review mode active" v={String(reviewModeActive)} />
        <Row k="Demo Proceedings loaded (GET /api/cases)" v={demoProceedingCount} />
        <Row k="Demo Matters loaded (GET /api/matters)" v={demoMatterCount} />
      </Section>

      <Section title="Server">
        <Row k="Application root (process.cwd())" v={process.cwd()} />
        <Row k="Process startup time" v={startupTime.toISOString()} />
        <Row k="Uptime (seconds)" v={process.uptime().toFixed(1)} />
      </Section>
    </div>
  );
}
