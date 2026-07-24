# NextCaseHQ v2 — Project Blueprint

Status: **DRAFT — awaiting Product Owner approval. No application code exists yet.**

This document is the complete architectural proposal for a greenfield rebuild of NextCaseHQ.
It reflects lessons learned about the *problem domain* (litigation practice management for
advocates) over the prior engagement, but contains no code, components, schema, or assets
carried over from the previous implementation. Nothing below is final — it is a proposal for
review, section by section, before a single line of application code is written.

---

## 1. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, strict mode | Non-negotiable for a domain this data-shaped; catches contract drift between DB, API, and UI at compile time. |
| Framework | Next.js (App Router) | Server components by default keep business logic off the client; one framework covers UI, API routes, and SSR without extra glue. |
| Database | PostgreSQL | Relational integrity matters here (Matters → Proceedings → Court Notes → Orders is a real foreign-key graph, not a document shape). |
| Tenant isolation | Native Postgres Row-Level Security, enforced from the first migration | The single most consequential architectural decision in a multi-tenant SaaS. Bolting it on later is how tenant-isolation bugs happen. It ships in Checkpoint 4 (first tenant-scoped table), not retrofitted later. |
| Query layer | Drizzle ORM | Type-safe, SQL-shaped (no hidden query generation), and plays well with session-scoped RLS (`SET LOCAL`) without ORM-level fighting. Migrations via Drizzle Kit. |
| Auth | Auth.js (NextAuth v5) with a credentials + email-link provider, DB-backed sessions | A real, working, audited auth library from day one — this is Checkpoint 2, not a deferred milestone. Hand-rolled JWT signing is explicitly out of scope; that path has a proven history of being deferred and then improvised under pressure. |
| Styling | Tailwind CSS | Fast, consistent, no CSS-file sprawl; a small design-token set (see §7) keeps it disciplined rather than ad hoc. |
| Client data fetching | TanStack Query, used sparingly | Only where a page needs client-side refetch/caching (e.g., optimistic updates on the Case Diary). Server components remain the default; this is not a global state library. |
| Testing | Jest + React Testing Library (unit/component), Playwright (E2E) | Matches the two failure modes that matter: business-logic correctness and real-browser behavior. |
| Deployment | Vercel (primary), Docker Compose for local dev parity | Vercel is the simplest correct choice for a Next.js app with this traffic profile; Docker Compose gives every contributor an identical local Postgres/Redis without depending on a shared cloud dev environment. |

**Explicitly not chosen, and why:**
- **No monorepo / workspaces** at the start. The prior project's `apps/web` + `apps/workers` +
  `packages/*` split added real coordination overhead before there was a proven need for a
  separate worker process. Start as one Next.js app; extract a worker only when a specific,
  named async job (e.g., a scheduled reminder) actually requires one — and only then.
- **No Redis** until a concrete need appears (rate limiting, background job queue). Provisioning
  infrastructure ahead of a proven requirement is exactly the kind of debt rule 3 rules out.
- **No custom session/JWT implementation.** Rule 3 ("no technical debt") and rule 6 ("production
  quality before moving on") both argue for a maintained, audited library over an in-house one for
  something as security-critical as session handling.

---

## 2. Folder Structure

```
nextcasehq-v2/
├── src/
│   ├── app/
│   │   ├── (marketing)/           # public routes: landing, pricing, etc. — Checkpoint 1
│   │   ├── (auth)/                # sign in / sign up / onboarding — Checkpoint 2
│   │   ├── (app)/                 # authenticated shell — Checkpoint 3+
│   │   │   ├── layout.tsx         # nav + tenant context resolution
│   │   │   ├── dashboard/
│   │   │   ├── matters/
│   │   │   ├── cases/             # Case Diary
│   │   │   └── drafts/            # Draft Builder
│   │   └── api/                   # route handlers, one folder per resource
│   ├── domain/                    # PURE business logic — no React, no DB client, no fetch.
│   │   ├── matter/
│   │   ├── proceeding/
│   │   ├── court-note/
│   │   ├── court-order/
│   │   └── draft/
│   ├── db/
│   │   ├── schema/                 # Drizzle schema, one file per entity
│   │   ├── migrations/
│   │   └── client.ts                # the one place tenant-context/RLS session var is set
│   ├── components/                  # UI primitives + composed components, no page-specific logic
│   ├── lib/                          # auth config, env parsing, external service clients
│   └── test/                         # shared test fixtures/helpers
├── e2e/                                # Playwright specs, one per checkpoint's primary flow
├── docs/
│   └── decisions/                       # one ADR (Architecture Decision Record) per non-obvious choice
├── .env.example
└── BLUEPRINT.md                          # this file, kept up to date as the single source of truth
```

**Rule this structure enforces:** anything in `src/domain/` must be a pure function or a plain
type — no imports from `next/*`, no `fetch`, no DB client. This is the one lesson from the prior
engagement I'm carrying forward as a *standard*, not as code: the most reusable, most testable,
most honestly-verifiable code in the old project was exactly the logic that lived in pure,
framework-free functions. Every page's non-trivial business logic (urgency classification, daily
bucketing, activity merging, etc.) lives here first; the page imports it.

---

## 3. Routing Strategy

- Three route groups, matching real access-control boundaries, not just visual sections:
  `(marketing)` — no auth, no tenant context. `(auth)` — no tenant context yet, session being
  established. `(app)` — requires a resolved session **and** tenant; enforced once, in that group's
  `layout.tsx`, not re-checked ad hoc per page.
- No page ever performs its own "is there a session" check — that's the layout's job. A page
  trusts that if it rendered inside `(app)`, a tenant is resolved.
- Every authenticated route lives under `(app)`; there is no second, parallel "preview" or "public
  demo" route tree. If a demo/review mode is wanted later, it is a explicit, separately-approved
  feature (see rule 5), not a shadow set of routes maintained alongside the real ones.

---

## 4. Database Strategy

- One tenant per row via `tenant_id`, enforced by **Postgres RLS policies**, not application-layer
  `WHERE tenant_id = ?` filters alone. The app sets `SET LOCAL app.tenant_id` at the start of every
  transaction (one function in `db/client.ts`); RLS policies reference that session variable. This
  is the pattern that survived the heaviest security scrutiny in the prior engagement, described
  here as a proven approach — no code carried over.
- Every tenant-scoped table gets its RLS policy in the *same migration* that creates the table.
  There is no "add RLS later" step.
- Migrations are forward-only, checked into `db/migrations/`, and run in CI against a throwaway
  database before merge.
- No soft-deletes-by-default. A table gets a `deleted_at` column only when a specific, named
  requirement calls for it (e.g., audit-trail retention on Matters) — not as a blanket convention.

---

## 5. Authentication Strategy

- Auth.js (NextAuth v5), DB session strategy (not pure JWT) so a session can be revoked
  server-side.
- Checkpoint 2 ships a **real, working** sign-up/sign-in flow — email + password to start, with the
  provider architecture left open for adding an email-link or OAuth provider later without a
  rewrite.
- Tenant resolution: on sign-up, a user either creates a new tenant (a firm) or is invited into an
  existing one. The active tenant id lives in the session, not in a client-side cookie the app
  trusts blindly — every request re-resolves it from the signed session server-side.
- No "demo mode" bypass of authentication anywhere in the auth strategy. If a public preview is
  wanted later, it is a separate, explicitly-scoped decision (rule 5) — not a parallel path punched
  through the real auth gate.

---

## 6. State Management

- **Server components are the default and the source of truth.** A component is a client
  component only when it needs interactivity (`onClick`, local form state, etc.) — not by default.
- **TanStack Query** for the narrow set of client-side cases that need it: optimistic UI (e.g.,
  marking a task complete on the Case Diary before the server confirms), or a view that needs to
  refetch without a full page reload.
- **No global client state library** (Redux/Zustand/etc.) until a concrete cross-page client-state
  requirement is identified and named. Until then, server state + URL search params + TanStack
  Query's cache cover everything the roadmap's first eight checkpoints need.

---

## 7. UI Philosophy

Superseded/refined by the Product Owner's Product Experience Charter — see §13, the authoritative
design direction for this rebuild. The standing points from this section that the Charter doesn't
already restate:

- A small, named set of primitives built once in Checkpoint 1 and reused everywhere after:
  `Button`, `Card` *(used sparingly per §13.3 — the Matter Register explicitly does not use it)*,
  `Badge`, `Input`, `Select`, `EmptyState`, `Section`. No page invents its own one-off button
  style.
- A design-token file (`src/lib/design-tokens.ts` or Tailwind theme extension) defines the full
  color/spacing/type scale up front, built fresh per §13.5 — colors and spacing are referenced by
  token name in components, never as one-off hex values sprinkled through pages.
- Desktop, tablet, and mobile are each designed as independent layouts per §13.1 — not one layout
  that reflows. See §13 for the full standard this rebuild is held to.
- No dark-mode, print-mode, or "focus mode" variants are built until a checkpoint specifically
  calls for one — avoiding speculative UI modes the roadmap doesn't ask for yet.

---

## 8. Coding Standards

- TypeScript `strict: true`, no `any` without an inline comment justifying it.
- ESLint + Prettier enforced in CI; a PR that doesn't pass lint doesn't merge.
- Pure business logic lives in `src/domain/*`; UI components import it, never reimplement it. (See
  §2 — this is the standard every checkpoint is held to, verified at each quality gate.)
- No direct string-concatenated SQL; Drizzle's query builder or parameterized `sql` template
  literals only.
- Every exported function has a one-line purpose comment only if its name doesn't already say it;
  no comment blocks explaining *what* code does when the code itself is legible.
- A module is not "done" with a `TODO` or a placeholder return value in it — rule 4 ("no
  placeholder implementations") is a merge-blocking standard, not an aspiration.

---

## 9. Testing Strategy

- **Unit tests** for everything in `src/domain/*` — these are pure functions, so they're cheap to
  test exhaustively and this is where regressions are cheapest to catch.
- **Integration tests** for every API route, run against a real (test) Postgres instance — RLS and
  tenant-isolation bugs do not show up against a mocked DB client, so mocking the DB layer for
  these tests is explicitly disallowed.
- **E2E tests** (Playwright) for one primary flow per checkpoint, run at both desktop and mobile
  viewports.
- A checkpoint's tests are part of its Definition of Done (see Quality Gate) — not a follow-up
  task filed for later.

---

## 10. Deployment Strategy

- One environment to start: staging, connected to a Vercel preview + a managed Postgres instance.
  Production is a deliberate, later decision, not stood up speculatively before Checkpoint 8.
- `.env.example` kept current in the same PR as any new environment variable — no undocumented
  config.
- No feature flags, review-mode fixtures, or demo-data mechanisms exist in the codebase unless a
  specific checkpoint explicitly asks for one (rule 5). If/when one is needed, it gets its own
  ADR describing exactly what it does and how to disable it.

---

## 11. Module Roadmap (Checkpoints)

Development proceeds in this order, one module at a time (rule 7 — never in parallel), each
gated on Product Owner approval before the next begins:

1. **Static landing page** — no auth, no DB. Establishes the design-token set and primitives from
   §7.
2. **Authentication + onboarding** — real sign-up/sign-in (Auth.js), tenant creation/invite flow.
3. **Application shell** — authenticated layout, primary navigation, dashboard skeleton.
4. **Matter Register** — the first tenant-scoped, RLS-protected table and its list UI (horizontal
   strips, no cards — §13.3).
5. **Matter Workspace** — the single-Matter detail view (first-screen hierarchy per §13.4).
6. **Case Diary** — the daily hearing-list view, built on the domain logic from `src/domain/`
   (court-category colour system per §13.2).
7. **Court Orders** — first-class order records, aggregated at the Matter level.
8. **Draft Builder (flagship)** — designed from first principles per the Product Owner's
   explicit direction: not based on any legal-drafting template, not modeled on any existing
   product's workflow or editor UI. This checkpoint starts with its own short design proposal
   (workflow, data model, UI approach) submitted for approval *before* any Draft Builder code is
   written — the same gate this whole blueprint is going through now, one level down.

Each checkpoint's Definition of Done is the Quality Gate below — nothing "mostly done" moves the
roadmap forward.

---

## 12. Quality Gate (applies to every checkpoint)

A checkpoint is complete only when all of the following are true:
- Functionality matches what was scoped — nothing more, nothing deferred silently.
- UI is polished at the primitive level (§7), not a first pass left "for later."
- Responsive behavior is verified at both desktop and mobile viewports with real screenshots.
- Unit + integration + relevant E2E tests pass.
- The Product Owner has personally reviewed and approved it.

No checkpoint begins before the previous one clears this gate.

---

## 13. Product Experience Charter

NextCaseHQ is not merely a legal case management system. It is a premium SaaS product built
specifically for advocates. Every screen must feel modern, clean, fast, and intentionally
designed. This charter is mandatory and governs every checkpoint from Checkpoint 1 onward — it is
the authoritative design direction for this rebuild, superseding the general notes in §7 wherever
the two differ.

### 13.1 Clean Design
Whitespace is used intentionally, not as unstructured padding. Oversized cards and unnecessary
empty areas are treated as defects — if a layout wastes screen space, it is redesigned before
review, not shipped and flagged as a follow-up. Every screen maximizes useful information without
feeling crowded. Desktop, tablet, and mobile layouts are each designed independently; responsive
design is not "shrink the desktop layout," it is three considered layouts sharing one design
system.

### 13.2 Case Diary
The advocate's daily working screen. Must stay clean and highly readable. The Product Owner's
previously approved layout is the reference point for structure. Every court category — Supreme
Court, High Court, District Court, Tribunal, Consumer Forum, Family Court, Labour Court,
Commercial Court, Others — gets its own consistent colour identity, applied consistently
everywhere that category appears across the app (Case Diary, Matter Register, Matter Workspace),
not redefined per screen. Verified independently on desktop, tablet, and mobile — each layout
purpose-built for its device, not a single responsive reflow.

### 13.3 Matter Register
Never uses large cards. Every matter is a clean horizontal strip showing the most important
information at a glance. Selecting a strip opens the Matter Workspace. A card-based Matter
Register is not permitted unless specifically approved as an exception.

### 13.4 Matter Workspace
The operational centre of every matter. Information hierarchy is critical: the first screen,
without scrolling, must answer — which matter is this; what is the next hearing; what happened
last; what is the latest court order; what requires attention today. Everything else is secondary
and ranked below these five answers, not ahead of them.

### 13.5 Visual Language
A completely fresh SaaS-grade design language — the previous project's palette is not reused
automatically. The interface reads as premium, professional, calm, modern, fast, and elegant.
Explicit avoidances: loud colours, heavy gradients, excessive shadows. Typography is clean and
highly readable; spacing is intentional, not filler.

### 13.6 Consistency
Every page belongs to the same design system — buttons, forms, tables, badges, dialogs,
navigation, typography, icons, and spacing all follow one unified visual language. This is the
same standard §8 (Coding Standards) holds code to, applied to UI: one system, no per-page
improvisation.

### 13.7 World-Class Standard
Every screen is evaluated against one question: would this look at home beside Linear, Notion,
Stripe Dashboard, or Vercel? If the answer is no, it is redesigned before it is submitted for
Product Owner approval — not shipped as a first pass with the polish deferred.

### 13.8 Product Owner Review
Every module is reviewed for workflow, UI, mobile experience, tablet experience, desktop
experience, visual polish, and ease of use. This is the same review this blueprint itself is
undergoing now, applied at every checkpoint — development proceeds to the next checkpoint only
after this review is passed. (Folded into the Quality Gate in §12, which already required "the
Product Owner has personally reviewed and approved it" — §13.8 makes explicit what that review
actually evaluates.)

---

## Open Questions for Approval

1. **Auth provider choice** — Auth.js with credentials + email is proposed; if a specific
   provider (Google/Microsoft SSO, since advocates often have firm-managed email) is wanted from
   day one instead of added later, say so now — it changes Checkpoint 2's scope.
2. **Hosting** — Vercel is proposed as primary target. If there's a hosting constraint (data
   residency, existing infra) that rules this out, better to fix it before Checkpoint 1 ships.
3. **Single-app vs. monorepo** — proposing to start single-app and only split when a real need
   appears. If a second deployable (e.g., a background worker) is already known to be needed soon,
   say so and the folder structure in §2 changes now rather than being reorganized mid-roadmap.

Awaiting approval to proceed. No application code will be written until this blueprint (or a
revised version of it) is approved.
