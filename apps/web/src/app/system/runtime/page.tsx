import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  isProductReviewModeEnabled,
  getCaseDiaryDemoCases,
  getCaseDiaryDemoCourtNotes,
  getCaseDiaryDemoOrders,
} from '@/lib/beta/demo-data';
import { rowUrgency } from '@/lib/domain/matter-urgency';
import { bucketFor, type DailyBucket } from '@/lib/domain/case-diary';
import { buildActivityItems, mergeMatterOrders, type ActivityType } from '@/lib/domain/matter-activity';
import { PRIMARY_APP_NAV_SECTIONS } from '@/lib/nav/primary-app-nav-sections';
import { LEGAL_TEMPLATES } from '@/lib/documents/editor/templates';
import { getInterviewConfigForTemplate } from '@/lib/documents/interview/registry';

/**
 * TEMPORARY runtime diagnostics page — answers one question: "is the
 * application I'm looking at actually running the implementation we've
 * been discussing." Not part of the product. Delete this whole directory
 * once that's settled.
 *
 * Every feature check below calls the SAME function the real page calls —
 * rowUrgency, bucketFor, buildActivityItems and mergeMatterOrders are
 * exported from shared lib modules that apps/web/src/app/matters/page.tsx,
 * apps/web/src/app/cases/page.tsx and apps/web/src/app/matters/[id]/page.tsx
 * import and use directly (see those files) — this page is not a
 * reimplementation running in parallel, it is the production code path,
 * invoked here against the same demo fixtures the real pages render, so a
 * wrong number here means the real page would show the same wrong number.
 * Mobile Navigation and Draft Builder's template count are live imports of
 * the actual config/data the real components render from, not a copy.
 * Only two things below remain static-file checks (Draft Builder's
 * Matter-linkage wiring) because no runtime state exists to probe — no
 * server flag or data value changes based on whether that wiring exists,
 * it is a call the page component either makes or doesn't. Both are
 * labeled explicitly as static checks, not dressed up as runtime ones.
 *
 * Guarded exactly as instructed: only renders in non-production NODE_ENV or
 * when PRODUCT_REVIEW_MODE=true. Otherwise a plain 404.
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

function staticFileMarkerCheck(relPath: string, marker: string) {
  const content = readFileSafe(relPath);
  return { present: content !== null && content.includes(marker), fileFound: content !== null };
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
      <span className="text-xs font-mono text-[#3A3222] text-right break-all whitespace-pre-line">{v}</span>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm mb-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-[#8A6D2F]">{title}</h2>
      {sub && <p className="text-[10px] text-[#B0A588] mb-3 mt-0.5">{sub}</p>}
      <div className={sub ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

export default function RuntimeDiagnosticsPage() {
  const guardOk = process.env.NODE_ENV !== 'production' || isProductReviewModeEnabled();
  if (!guardOk) notFound();

  // ---- Git / build identity ----
  const branch = tryGit('git rev-parse --abbrev-ref HEAD');
  const sha = tryGit('git rev-parse HEAD');
  const shortSha = tryGit('git rev-parse --short HEAD');
  const subject = tryGit('git log -1 --format=%s');
  const authoredAt = tryGit('git log -1 --format=%aI');
  const aheadBehindMain = tryGit('git rev-list --left-right --count origin/main...HEAD');
  const workingTreeStatus = tryGit('git status --porcelain');

  let buildTimestamp = 'no .next/BUILD_ID present (dev mode has no persisted build artifact)';
  try {
    buildTimestamp = fs.statSync(path.join(process.cwd(), '.next', 'BUILD_ID')).mtime.toISOString();
  } catch {
    // left as default message
  }

  const pkgRaw = readFileSafe('package.json');
  const appVersion = pkgRaw ? (JSON.parse(pkgRaw).version ?? 'unknown') : 'package.json not found';
  const startupTime = new Date(Date.now() - process.uptime() * 1000);
  const fingerprint = `${branch}@${shortSha} · started ${startupTime.toISOString()}`;

  // ---- Case Diary: real getCaseDiaryDemoCases() + real bucketFor() ----
  const reviewModeActive = isProductReviewModeEnabled();
  const demoProceedings = getCaseDiaryDemoCases();
  const today = new Date().toISOString().slice(0, 10);
  const bucketCounts: Record<DailyBucket, number> = { adjourned: 0, today: 0, completed: 0, upcoming: 0, other: 0 };
  demoProceedings.forEach((p) => {
    bucketCounts[bucketFor(p, today)] += 1;
  });

  // ---- Matter Register: real rowUrgency() against real demo dates ----
  const urgencyResults = demoProceedings.map((p) => ({ title: p.title, ...rowUrgency(p.hearing_date) }));
  const urgencyCounts = { OVERDUE: 0, TODAY: 0, SOON: 0, none: 0 };
  urgencyResults.forEach((r) => {
    if (r.level === 'OVERDUE') urgencyCounts.OVERDUE += 1;
    else if (r.level === 'TODAY') urgencyCounts.TODAY += 1;
    else if (r.level === 'SOON') urgencyCounts.SOON += 1;
    else urgencyCounts.none += 1;
  });

  // ---- Matter Workspace / Activity Stream + Court Orders: real
  // buildActivityItems()/mergeMatterOrders() against every demo
  // Proceeding's real court-note/order fixtures, flattened exactly the way
  // the Matter Workspace flattens across every linked Proceeding. ----
  const allCourtNotes = demoProceedings.flatMap((p) => getCaseDiaryDemoCourtNotes(p.id) ?? []) as Array<{
    id: string;
    hearing_date: string;
  }>;
  const ordersPerProceeding = demoProceedings.map((p) => ({
    proceedingTitle: p.title,
    orders: (getCaseDiaryDemoOrders(p.id) ?? []) as Array<{ id: string; order_date: string; [k: string]: unknown }>,
  }));
  const mergedOrders = mergeMatterOrders(ordersPerProceeding as never);
  const activityItems = buildActivityItems(allCourtNotes, mergedOrders, [], []);
  const activityCounts: Record<ActivityType, number> = { HEARING: 0, ORDER: 0, ACTION: 0, MILESTONE: 0 };
  activityItems.forEach((i) => {
    activityCounts[i.type] += 1;
  });

  // ---- Mobile Navigation: the real, live config both PrimaryAppNav and
  // PrimaryAppNavMobile import and render — not a string search. ----
  const navSections = PRIMARY_APP_NAV_SECTIONS;

  // ---- Draft Builder: real LEGAL_TEMPLATES + real interview registry. ----
  const templateInterviewFlags = LEGAL_TEMPLATES.map((t) => ({
    name: t.name,
    hasGuidedInterview: getInterviewConfigForTemplate(t.id) !== undefined,
  }));
  const guidedInterviewCount = templateInterviewFlags.filter((t) => t.hasGuidedInterview).length;
  // No live toggle exists for Matter-linkage yet (the page never reads a
  // matter_id from its own URL) — there is no runtime state to probe for
  // this one, so it stays an explicit, labeled static check rather than
  // being disguised as a runtime result.
  const draftBuilderMatterWiring = staticFileMarkerCheck('src/app/dashboard/draft-builder/page.tsx', 'matterId');

  return (
    <div className="max-w-3xl w-full mx-auto px-6 py-10">
      <div className="mb-6 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl">
        <p className="text-xs font-bold text-[#6F5624]">
          Temporary diagnostics page. Every number below comes from calling the real, shared
          functions the actual pages call — not a reimplementation, not a string search (except
          where explicitly labeled static). Remove this route once verification is complete.
        </p>
      </div>

      <div className="mb-6 p-5 bg-[#111111] rounded-xl">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588] mb-1">Runtime Fingerprint</p>
        <p className="text-sm md:text-base font-mono font-black text-white break-all">{fingerprint}</p>
      </div>

      <h1 className="text-xl font-black uppercase tracking-tight text-[#111111] mb-6">Runtime Diagnostics</h1>

      <Section title="Build identity">
        <Row k="Branch" v={branch} />
        <Row k="Commit SHA" v={sha} />
        <Row k="Commit subject" v={subject} />
        <Row k="Commit authored at" v={authoredAt} />
        <Row k="Ahead / behind origin/main" v={aheadBehindMain || '(unavailable — origin/main not fetched)'} />
        <Row k="Working tree" v={workingTreeStatus ? `dirty:\n${workingTreeStatus}` : 'clean'} />
        <Row k="Build timestamp (.next/BUILD_ID mtime)" v={buildTimestamp} />
        <Row k="Startup time" v={startupTime.toISOString()} />
        <Row k="Uptime (seconds)" v={process.uptime().toFixed(1)} />
        <Row k="Application version (package.json)" v={appVersion} />
      </Section>

      <Section title="Environment">
        <Row k="NODE_ENV" v={process.env.NODE_ENV ?? 'unset'} />
        <Row k="PRODUCT_REVIEW_MODE" v={process.env.PRODUCT_REVIEW_MODE ?? 'unset'} />
        {ALLOWED_NEXT_PUBLIC_KEYS.map((key) => (
          <Row key={key} k={key} v={process.env[key] ?? 'not set'} />
        ))}
      </Section>

      <Section
        title="Case Diary — real getCaseDiaryDemoCases() + real bucketFor()"
        sub="apps/web/src/lib/beta/demo-data.ts + apps/web/src/lib/domain/case-diary.ts, the exact functions cases/page.tsx calls"
      >
        <Row k="Review mode active" v={String(reviewModeActive)} />
        <Row k="Demo Proceedings returned" v={demoProceedings.length} />
        <Row k="→ Today's Hearings bucket" v={bucketCounts.today} />
        <Row k="→ Adjourned Hearings bucket" v={bucketCounts.adjourned} />
        <Row k="→ Completed Hearings bucket" v={bucketCounts.completed} />
        <Row k="→ Upcoming Hearings bucket" v={bucketCounts.upcoming} />
        <Row k="→ Other (register-only) bucket" v={bucketCounts.other} />
      </Section>

      <Section
        title="Matter Register — real rowUrgency()"
        sub="apps/web/src/lib/domain/matter-urgency.ts, the exact function matters/page.tsx calls, run against every demo Proceeding's hearing_date"
      >
        <Row k="Proceedings classified OVERDUE" v={urgencyCounts.OVERDUE} />
        <Row k="Proceedings classified TODAY" v={urgencyCounts.TODAY} />
        <Row k="Proceedings classified SOON (≤7d)" v={urgencyCounts.SOON} />
        <Row k="Proceedings with no urgency badge" v={urgencyCounts.none} />
      </Section>

      <Section
        title="Matter Workspace / Activity Stream — real buildActivityItems()"
        sub="apps/web/src/lib/domain/matter-activity.ts, the exact function matters/[id]/page.tsx calls, against every demo Proceeding's court notes + orders"
      >
        <Row k="Total activity items generated" v={activityItems.length} />
        <Row k="→ HEARING" v={activityCounts.HEARING} />
        <Row k="→ ORDER" v={activityCounts.ORDER} />
        <Row k="→ ACTION" v={activityCounts.ACTION} />
        <Row k="→ MILESTONE" v={activityCounts.MILESTONE} />
      </Section>

      <Section
        title="Court Orders aggregation — real mergeMatterOrders()"
        sub="apps/web/src/lib/domain/matter-activity.ts, the exact function matters/[id]/page.tsx's fetchMatterOrders calls"
      >
        <Row k="Total aggregated orders across all demo Proceedings" v={mergedOrders.length} />
      </Section>

      <Section
        title="Mobile Navigation — live PRIMARY_APP_NAV_SECTIONS import"
        sub="apps/web/src/components/PrimaryAppNav.tsx — the same exported config array PrimaryAppNavMobile.tsx imports and renders, read here directly, not searched for as a string"
      >
        <Row k="Section count" v={navSections.length} />
        {navSections.map((s) => (
          <Row key={s.key} k={s.label} v={s.href} />
        ))}
      </Section>

      <Section
        title="Draft Builder — live LEGAL_TEMPLATES + interview registry import"
        sub="apps/web/src/lib/documents/editor/templates.ts and .../interview/registry.ts — real data, not a string search"
      >
        <Row k="Template count" v={LEGAL_TEMPLATES.length} />
        <Row k="Templates with a Guided Interview" v={guidedInterviewCount} />
        {templateInterviewFlags.map((t) => (
          <Row key={t.name} k={t.name} v={t.hasGuidedInterview ? 'Guided Interview' : 'Static template'} />
        ))}
        <Row
          k="Matter integration wiring (static check — no runtime toggle exists yet)"
          v={
            draftBuilderMatterWiring.fileFound
              ? draftBuilderMatterWiring.present
                ? 'present'
                : 'NOT WIRED — draft-builder never reads/passes a matter_id today'
              : 'file not found'
          }
        />
      </Section>

      <Section title="Server">
        <Row k="Application root (process.cwd())" v={process.cwd()} />
      </Section>
    </div>
  );
}
