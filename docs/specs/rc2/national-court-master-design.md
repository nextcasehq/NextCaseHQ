# National Court Master — Technical Design Document

**Status:** Design only — not implemented. This is the architectural foundation for Release Candidate 2's court-data work; nothing in this document should be read as describing what exists today. For what exists today, see `apps/web/src/lib/ecourts-registry/` (the `CourtSystemConfig` registry, four `status: 'available'` configs, and the `CourtDataReport` "Can't find your court?" queue shipped in Release Candidate 1) and `docs/knowledge-base/CONTRIBUTING_COURT_DATA.md` (the manual-verification process that predates and motivates this design).

**Why this exists:** RC1 deliberately kept court reference data inside hand-written TypeScript config files (`configs/district-courts.ts`, `configs/high-courts.ts`, `configs/consumer-commissions.ts`) — the right call for a handful of verified entries, but not a foundation that scales to a genuinely national catalogue, supports versioning, or survives a court being renamed. This document designs what that catalogue becomes when it outgrows a config file, without prescribing exactly when that migration happens — RC1's registry keeps working unchanged until it does.

---

## 1. Design Principles

These carry forward unchanged from RC1's registry and apply to every decision below:

1. **Never assert an unverified fact as a real dropdown option.** A record without a citable source is not in the catalogue — it is a gap, tracked as a gap, not papered over with a plausible-sounding guess.
2. **A correction is never silent.** Every change to the catalogue — from an official sync or from advocate feedback — is a reviewable, attributable, reversible event, never an in-place overwrite with no trail.
3. **The catalogue is data, not code.** Reference data belongs in tables (or, short of a full migration, still-honest config files) that a non-engineer reviewer can act on — not buried in application logic.
4. **Free-text is a permanent, first-class fallback, not a bug.** No matter how complete the catalogue becomes, an advocate must always be able to type a court name directly. Completeness is a spectrum this system improves along, never a gate that blocks entry.

---

## 2. Data Model

### 2.1 Entity overview

```
State/UT
  └── District                                  (district-level geography)
        └── CourtComplex                        (a physical building/campus)
              └── CourtEstablishment             (one functioning court inside a complex)
CourtSystem                                       (District Courts, High Courts, Supreme Court,
                                                    Consumer Commissions, Commercial Courts, each
                                                    Tribunal — one row per system)
  └── Bench                                       (a seat of that system — a Principal Seat or a
                                                    circuit bench; High Courts, most Tribunals)
        └── Jurisdiction                          (territorial + pecuniary + subject-matter scope
                                                    a Bench or Establishment actually has)
CaseCategory                                       (Writ Petition, Civil Suit, SLP, ... — scoped to
                                                    the CourtSystem(s) that use it)
```

`CourtEstablishment` (district-tier) and `Bench` (system-tier) are deliberately separate entities rather than one generic "court node," because they vary on different axes: an Establishment's identity is tied to a District and a physical Complex; a Bench's identity is tied to a CourtSystem and has no District at all (a High Court bench serves an entire state or region, never one district). Forcing them into one shape would either lose the district relationship or fabricate a fake one for Benches — exactly the kind of structural dishonesty this system exists to avoid.

### 2.2 Core tables (illustrative DDL — column names indicative, not final)

```sql
-- Geography (stable, low-churn; India's own administrative divisions,
-- not eCourts-specific — see RC1's INDIAN_STATES_AND_UTS precedent)
CREATE TABLE court_master_state (
    id              UUID PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,        -- e.g. 'IN-KL' (ISO 3166-2:IN)
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL,               -- 'STATE' | 'UNION_TERRITORY'
    valid_from      DATE NOT NULL DEFAULT '1950-01-26',
    valid_to        DATE,                        -- null = currently in force
    superseded_by   UUID REFERENCES court_master_state(id)
);

CREATE TABLE court_master_district (
    id              UUID PRIMARY KEY,
    state_id        UUID NOT NULL REFERENCES court_master_state(id),
    code            TEXT NOT NULL UNIQUE,        -- e.g. 'IN-KL-EKM'
    name            TEXT NOT NULL,
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    superseded_by   UUID REFERENCES court_master_district(id)  -- district split/renamed
);

-- Court systems (District Courts, High Courts, Supreme Court, each
-- Tribunal, Consumer Commissions, Commercial Courts — one row each,
-- the direct successor of RC1's COURT_SYSTEMS registry array)
CREATE TABLE court_master_system (
    id              UUID PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,        -- e.g. 'HIGH_COURTS', 'NCLT'
    name            TEXT NOT NULL,
    tier            TEXT NOT NULL,               -- 'SUPREME' | 'HIGH_COURT' | 'DISTRICT' |
                                                  -- 'TRIBUNAL' | 'COMMISSION' | 'COMMERCIAL'
    has_district_geography BOOLEAN NOT NULL,     -- true for District Courts; false for
                                                  -- systems whose lowest tier is a Bench
    has_benches     BOOLEAN NOT NULL
);

-- Physical/organizational tiers under District Courts
CREATE TABLE court_master_complex (
    id              UUID PRIMARY KEY,
    district_id     UUID NOT NULL REFERENCES court_master_district(id),
    name            TEXT NOT NULL,
    address         TEXT,
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    source_url      TEXT NOT NULL,               -- required; see Section 8
    source_verified_at DATE NOT NULL
);

CREATE TABLE court_master_establishment (
    id              UUID PRIMARY KEY,
    complex_id      UUID NOT NULL REFERENCES court_master_complex(id),
    name            TEXT NOT NULL,               -- e.g. 'Munsiff Court, Aluva'
    establishment_type TEXT NOT NULL,            -- Civil Court, Magistrate Court, Family Court, ...
                                                  -- (RC1's CourtEstablishment.type, unchanged)
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    superseded_by   UUID REFERENCES court_master_establishment(id),
    source_url      TEXT NOT NULL,
    source_verified_at DATE NOT NULL
);

-- Benches (High Courts, Tribunals) — no district; scoped to a system
-- and a jurisdiction, not a complex.
CREATE TABLE court_master_bench (
    id              UUID PRIMARY KEY,
    system_id       UUID NOT NULL REFERENCES court_master_system(id),
    name            TEXT NOT NULL,               -- e.g. 'Nagpur Bench'
    is_principal_seat BOOLEAN NOT NULL DEFAULT false,
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    source_url      TEXT NOT NULL,
    source_verified_at DATE NOT NULL
);

-- Jurisdiction: what a Bench or Establishment is actually empowered to
-- hear. Many-to-many against geography (a Bench can cover several
-- districts; a district can, rarely, be split across two Benches for
-- different subject matters).
CREATE TABLE court_master_jurisdiction (
    id                  UUID PRIMARY KEY,
    bench_id            UUID REFERENCES court_master_bench(id),
    establishment_id     UUID REFERENCES court_master_establishment(id),
    district_id         UUID REFERENCES court_master_district(id),
    state_id            UUID REFERENCES court_master_state(id),
    subject_matter       TEXT,                   -- nullable = general jurisdiction
    pecuniary_limit_min  NUMERIC,
    pecuniary_limit_max  NUMERIC,
    valid_from           DATE NOT NULL,
    valid_to             DATE,
    CHECK (bench_id IS NOT NULL OR establishment_id IS NOT NULL),
    CHECK (district_id IS NOT NULL OR state_id IS NOT NULL)
);

-- Case categories, scoped to the systems that actually use them (RC1's
-- CASE_TYPE_OPTIONS / HIGH_COURT_CASE_CATEGORIES / SUPREME_COURT_CASE_CATEGORIES,
-- normalized out of per-config constants into shared, queryable rows).
CREATE TABLE court_master_case_category (
    id          UUID PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- e.g. 'WRIT_PETITION_CIVIL'
    label       TEXT NOT NULL,
    valid_from  DATE NOT NULL,
    valid_to    DATE
);

CREATE TABLE court_master_system_case_category (
    system_id       UUID NOT NULL REFERENCES court_master_system(id),
    case_category_id UUID NOT NULL REFERENCES court_master_case_category(id),
    PRIMARY KEY (system_id, case_category_id)
);
```

Every leaf table (`complex`, `establishment`, `bench`) carries `source_url` and `source_verified_at` as **required, not optional** columns — a row cannot exist without a citable source. This is a direct, structural continuation of RC1's Ernakulam precedent and the `validate-court-data.js` script's own enforcement, now expressed as a schema constraint instead of a script-level check.

### 2.3 How each forum type maps onto this model

| Court system | Geography path | Bench? | Notes |
|---|---|---|---|
| District Courts | State → District → Complex → Establishment | No | RC1's existing shape, unchanged |
| High Courts | State → (System, no per-state row) | Yes | A High Court's jurisdiction spans one or more states (`court_master_jurisdiction.state_id`); its Benches are the actual seats. RC1's `STATE_TO_HIGH_COURT` map becomes `court_master_jurisdiction` rows |
| Supreme Court | None | No (single seat) | One `court_master_system` row, one implicit "seat," no geography table involvement at all |
| Consumer Commissions | State → District (for District Commission) or State (State Commission) or none (National Commission) | No | Tier is a property of jurisdiction scope, not a separate table — District/State/National Commissions are three `court_master_jurisdiction` shapes against the same `court_master_system` row |
| Commercial Courts | State → District → Complex → Establishment, OR a Bench-style seat in states that route commercial matters through a High Court's Commercial Division | Sometimes | The one system that can legitimately need *either* path — modeled by leaving both `establishment_id` and `bench_id` nullable-but-exclusive on `court_master_jurisdiction`, never both populated for the same row |
| Tribunals (NCLT, NCLAT, RERA, DRT/DRAT, CAT, Armed Forces Tribunal, ITAT, GSTAT) | Varies per tribunal | Yes (most) | Each gets its own `court_master_system` row with `has_benches = true`; NCLAT/CAT/AFT have national + regional bench structures similar to a High Court's; RERA is unusual in being state-legislated (each state's RERA is arguably its own `court_master_system`, not one national system with benches — a genuine open design question, see Section 11) |

---

## 3. Identifiers

**Two identifiers per entity, deliberately not one:**

- **`id` (UUID, primary key):** stable forever, meaningless, never displayed to a user, never reused even after a `valid_to` supersession. This is what every foreign key, every `CourtDataReport`, and every application-layer reference uses.
- **`code` (human-readable, stable business key):** a hierarchical, hyphenated code — `IN-<STATE>-<DISTRICT>-<TYPE>-<DISAMBIGUATOR>` — e.g. `IN-KL-EKM-MUNSIFF-ALUVA`, `IN-HC-BOMBAY-NAGPUR-BENCH`, `IN-SC` (the Supreme Court, no further qualification needed). This is what appears in exports, in `CourtDataReport.court_system_id`, and in any future public-facing reference — human-debuggable, diffable in a code review, and stable across a rename (the *code* only changes if the court's identity fundamentally changes, not on every cosmetic edit).

**Why not just use eCourts' own internal court/complex codes as the primary identifier?** Two reasons. First, eCourts' internal codes (where they exist at all in the public UI) are not confirmed to be a stable, documented, versioned identifier scheme — treating an undocumented internal code as a foreign key risks silent breakage if it changes. Second, this catalogue must remain meaningful even for entries sourced from before any eCourts integration exists (Ernakulam's current entries have no eCourts-issued code at all). If a genuine eCourts/NIC data-sharing arrangement materializes and does expose stable codes, store them as an *additional* `external_ecourts_code` column — never as the primary key, so the catalogue is never hostage to an external system's ID stability.

**A `code` is never reused or reassigned**, even for a defunct court — see Section 9.

---

## 4. Relationships Between Courts, Benches, Jurisdictions, and Case Types

Summarized from the schema above, stated explicitly because this is the crux of "how does this actually fit together":

- A **Bench** or **Establishment** *has* one or more **Jurisdiction** rows (its actual territorial/pecuniary/subject-matter authority) — never the reverse; jurisdiction is a fact *about* a court, not a container courts live inside.
- A **Jurisdiction** row points at *either* a geography node (state or district) *or* is implicitly "all of it" when the parent Bench is a Principal Seat with no narrower jurisdiction row at all — absence of a jurisdiction row is not an error, it is "not yet narrowed," and the application layer must treat it as "ask a human," never as "assume unlimited."
- **Case categories** are many-to-many against **court systems**, not against individual Benches or Establishments — "Writ Petition" is a High-Court-system-level concept, not something that varies bench-to-bench (a bench either sits within a High Court or it doesn't; if it does, it hears the same category set the system defines). Establishment-level or Bench-level *pecuniary* limits, by contrast, genuinely do vary row-to-row, which is why pecuniary bounds live on `court_master_jurisdiction`, not on the category table.
- **Historical continuity** (Section 9) is modeled as a same-table self-reference (`superseded_by`) rather than a separate "history" table, so a query for "what does this old code resolve to today" is a single recursive lookup, not a join across two schemas.

---

## 5. Versioning

Two independent versioning concerns, deliberately not conflated:

### 5.1 Row-level temporal validity (`valid_from` / `valid_to`)

Every entity that can be renamed, reorganized, or retired carries these columns. A query against the catalogue always takes an as-of date (defaulting to today) and filters `valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of)`. This means:

- A Matter created in 2019 referencing a since-renamed court still resolves correctly if displayed with `as_of = matter.opened_at` — the historical record is never silently rewritten.
- The *current* application UI (CourtPicker, search, reports) always queries `as_of = today` implicitly, so advocates never see a defunct court as a live option.

### 5.2 Catalogue release versioning

Separately from row-level dates, the catalogue as a whole is versioned as a release, analogous to a software release: `court_master_release` (`version` semver-style e.g. `2026.08.1`, `published_at`, `change_summary`, `source_batch_id`). Every write to a leaf table happens inside exactly one release. This gives:

- A clean audit trail: "what did the catalogue look like on the day this Matter was created" is answerable by release, not just by row-level dates.
- A safe rollback point: if a batch sync is later found to have imported bad data, the whole release can be reverted without hand-picking rows.
- A meaningful changelog surfaced to advocates/admins ("47 new court establishments added in Kerala this release") rather than silent drift.

---

## 6. Synchronization Strategy

Two parallel input pipelines feed the same release-versioned tables — they are not alternatives to choose between, but two sources that both need reconciling into one catalogue:

### 6.1 Official/bulk sync (if and when a licensed source exists)

A **staging-then-promote** pipeline, never a direct write to the live tables:

1. **Ingest** into a staging schema (`court_master_staging.*`, mirroring the live table shapes) from whatever the authoritative source turns out to be (see `CONTRIBUTING_COURT_DATA.md`'s open question — a licensed NIC/eCourts data-sharing arrangement, or a data.gov.in export).
2. **Diff** staging against the current live release: additions, renames (matched by fuzzy name + geography proximity, always surfaced for human confirmation, never auto-applied for anything but pure additions), and removals (a court disappearing from the source is *never* auto-deleted — it's flagged `valid_to` pending human confirmation that it was actually closed, not just omitted from an incomplete feed).
3. **Review** the diff through an admin screen (see Section 10) — a human approves the batch, in whole or with individual rows excluded.
4. **Promote**: approved rows become a new `court_master_release`, with every changed row's `source_url`/`source_verified_at` updated to the sync's provenance.

This pipeline is designed once and never run manually — but until a real source exists, it simply never fires, and the catalogue continues to grow only through 6.2.

### 6.2 Incremental manual verification (the path RC1 already ships)

This is `docs/knowledge-base/CONTRIBUTING_COURT_DATA.md` and `scripts/ecourts-registry/validate-court-data.js`, unchanged in spirit: someone verifies a batch of real court data against a citable source, validates it, and it's reviewed into a release exactly like an official sync batch — the only difference is provenance (`source_url` is a court's own website or the eCourts portal, not a bulk feed) and that it happens court-by-court or district-by-district instead of nationwide. **This path never goes away**, even after an official sync pipeline exists — a licensed feed may still lag reality, and this remains the fallback for anything it misses.

---

## 7. Advocate Feedback Review Workflow

Builds directly on the shipped `CourtDataReport` table (RC1) rather than replacing it:

1. **Submission** (already shipped): an advocate hits "Can't find your court?" in `CourtPicker`, submits a proposed court name with whatever geography context was already selected. Status `OPEN`.
2. **Triage**: a reviewer (initially an engineer/ops person; eventually a dedicated admin role) periodically reviews the `OPEN` queue (Section 10's UI) and attempts to verify the claim against a real source.
3. **Verification outcome:**
   - **Confirmed real, sourced** → status `REVIEWED`, and the reviewer creates a proper `court_master_establishment` (or `bench`, or `jurisdiction`) row referencing this report's id in a `resolved_from_report_id` column, with its own `source_url` — the report becomes provenance for a new catalogue row, not the row itself. Status then moves to `INCORPORATED` once that row ships in a release.
   - **Cannot verify / not a real court / duplicate** → status `DISMISSED`, with a required `resolution_note` (never a silent delete — the submitting advocate's report stays visible in their own history, just marked closed).
4. **Closing the loop**: the advocate who submitted it is *not* currently notified in RC1's schema — recommend adding a `notified_at` timestamp and a lightweight in-app notification ("Your reported court, Family Court Perumbavoor, is now in the catalogue") once the admin UI exists, so the feedback loop is visibly closed, not just internally resolved.

---

## 8. Conflict Resolution: Official Data vs. Advocate Feedback

The rule is simple and should stay simple: **a `CourtDataReport` is a lead, never a source.** It can point a reviewer at something worth verifying; it cannot, by itself, create or modify a catalogue row. Concretely:

- If an official sync and an open advocate report **agree** (the sync's next run includes the exact court the advocate flagged), the report is auto-matched and moved to `INCORPORATED`, crediting the report but sourcing the row from the sync.
- If an official sync **contradicts** an already-`INCORPORATED` report-derived row (e.g., the sync says a court closed that a report said was open), the sync wins for existence/status, but the conflict is logged to a `court_master_conflict_log` table for human review rather than silently overwritten — a sync could itself be wrong or stale.
- If an advocate report **cannot be verified** against any source, it is dismissed — it never becomes a catalogue row on the strength of one unverified submission, no matter how plausible. This is the same standard RC1 already holds every hand-entered row to; feedback does not get a lower bar than a human contributor does.

---

## 9. Historical Renamings and Reorganizations

Modeled uniformly across every entity via the `superseded_by` self-reference plus `valid_from`/`valid_to`, already shown in Section 2.2:

- **A pure rename** (same court, new name — e.g., a bench renamed after a public figure): create a new row, set the old row's `valid_to` and `superseded_by`, keep the old `code` resolvable (queries follow `superseded_by` transitively to the current row). The new row gets its own `code`; the old `code` is retired, never reassigned.
- **A split** (one district becomes two): the original row's `valid_to` is set; two new rows are created, each with their own `superseded_by`-style back-reference via a many-to-many `court_master_succession` join table (a straight `superseded_by` foreign key can't express one-to-many splits) — `(predecessor_id, successor_id, relationship)` with `relationship` values `'RENAMED' | 'SPLIT' | 'MERGED' | 'ABOLISHED'`.
- **A merger** (two establishments consolidated into one): the reverse of a split — two predecessor rows, one successor row, `relationship = 'MERGED'`.
- **Abolition with no successor**: `valid_to` set, `court_master_succession` row with `relationship = 'ABOLISHED'` and no successor id — the application layer must render this distinctly from a rename ("This court was abolished in 2024; matters were transferred to X" vs. simply resolving forward).

Every Matter/Proceeding record that stored a `court` string or (post-migration) a `court_master_establishment_id` at the time of filing keeps pointing at the *original* row — history is never rewritten — while any *new* filing or search resolves through to the live successor automatically.

---

## 10. Exposing the Catalogue to the Application

A single service boundary, so no consuming code ever queries `court_master_*` tables directly — mirroring the discipline `DatabaseClient` already enforces for tenant data:

```
CourtMasterService (server-side, apps/web/src/lib/court-master/)
  ├── query layer (read-only, used by CourtPicker, Matter/Proceeding
  │     forms, search filters, reports, AI context builders)
  │     - listStates(asOf?)
  │     - listDistricts(stateId, asOf?)
  │     - listEstablishments(complexId, asOf?)
  │     - listBenches(systemId, asOf?)
  │     - resolveJurisdiction(establishmentOrBenchId, asOf?)
  │     - search(query, filters, asOf?)   // free-text search across
  │                                       // names, for the CourtPicker's
  │                                       // "can't find it" flow to check
  │                                       // before assuming a true gap
  │     - resolve(code | id)             // follows `superseded_by` chains
  │
  ├── contribution layer (the CourtDataReport workflow, Section 7)
  │     - submitReport(...)
  │     - listReports(status, filters)    // admin queue
  │     - resolveReport(id, outcome, ...)
  │
  └── sync layer (Section 6.1, only meaningful once an official source exists)
        - ingestBatch(source, payload)
        - diffAgainstLive(batchId)
        - promoteRelease(batchId, approvedRowIds)
```

`CourtPicker` (RC1) becomes a thin UI over the query layer instead of importing `COURT_SYSTEMS`/config files directly — the migration path is: keep RC1's `CourtSystemConfig` shape as the *wire format* the query layer returns (so `CourtPicker`'s rendering code barely changes), while the actual data backing it moves from hardcoded TS objects to these tables. This means RC1 ships and keeps working entirely unchanged until this migration happens — nothing about this design requires touching `CourtPicker` today.

An **admin review UI** (recommended in the prior report, designed here) is a thin frontend over `listReports`/`resolveReport` plus a batch-review screen over `diffAgainstLive`/`promoteRelease` — no new backend concepts beyond what's specified above.

---

## 11. Gap Analysis and Difficulty Estimate

| Category | Current state | What "complete" requires | Estimated difficulty | Why |
|---|---|---|---|---|
| States & Union Territories | Complete (36, RC1) | Nothing — nearly definitionally stable | **Trivial** | Already done; nation-level admin geography changes on a decade timescale |
| Districts | Complete for most major states (RC1); a few gaps | Verify remaining states; monitor for new districts (India periodically carves out new ones) | **Low** | Stable public administrative fact, easy to verify per-state, no sourcing ambiguity |
| District Court Complexes | Not modeled as a distinct tier yet (RC1 goes straight to Establishment) | Introduce the tier; populate per district | **Medium** | Real, stable, but genuinely requires per-district sourcing — hundreds of districts |
| District Court Establishments | Verified for Ernakulam only | Every other district, nationwide | **Very High** | The long tail — thousands of individual establishments, each needing its own citable source; this is the category a bulk feed would help most |
| High Court jurisdiction mapping | Complete (RC1) | Nothing | **Trivial** | Stable, well-known, already shipped |
| High Court Benches | Not modeled (RC1's Bench step is always free-text) | ~15-20 real circuit benches nationwide, each independently verifiable | **Low-Medium** | Small, well-known, stable list — one of the best near-term wins available without a bulk source |
| High Court case categories | Complete, generic (RC1) | Confirm no High-Court-specific category gaps | **Low** | Already largely done; refinement only |
| Supreme Court | Complete (RC1) | Nothing | **Trivial** | Single seat, stable categories, already shipped |
| Consumer Commissions (State/National tier) | Complete (RC1) | Nothing | **Trivial** | One body per state + one national body, already shipped |
| Consumer Commissions (District tier) | Free-text only | Every District Commission nationwide | **High** | Similar long-tail problem to District Court Establishments, smaller total count |
| Commercial Courts | Not modeled as a distinct system yet | Identify which districts/states have designated Commercial Courts vs. route through ordinary courts | **Medium-High** | Genuinely varies by state notification, not a single clean nationwide rule — requires real legal/administrative research, not just a directory |
| NCLT / NCLAT | Not modeled | Bench list (~15-16 NCLT benches, few NCLAT benches) | **Low-Medium** | Small, stable, well-documented — a strong near-term candidate alongside High Court benches |
| RERA | Not modeled | Every state's RERA authority (state-legislated, not one national system) | **Medium** | Small count (~28-36) but structurally different per state — needs the open design question in Section 2.3 resolved first |
| DRT / DRAT | Not modeled | Bench list | **Low-Medium** | Small, stable |
| CAT (Central Administrative Tribunal) | Not modeled | Principal bench + regional benches | **Low-Medium** | Small, stable, well-documented |
| Armed Forces Tribunal | Not modeled | Principal bench + regional benches | **Low-Medium** | Small, stable |
| ITAT | Not modeled | Bench list (~60+ benches across cities) | **Medium** | Larger than most tribunals, but still a bounded, well-documented list |
| GSTAT | Not modeled | Bench list (a newer tribunal; structure may still be stabilizing) | **Medium-High** | Newer body — verify current structure hasn't changed recently before treating any list as stable |
| Historical renames/reorganizations | Not modeled at all yet | Retrofit `superseded_by`/`court_master_succession` once the base tables exist | **Medium** (structural work, not data-sourcing work) | This is schema and process work, not a data-collection long-tail — can be built before most of the data above is fully populated |

**Reading this table as a roadmap:** the "Low" and "Low-Medium" rows (High Court benches, NCLT/NCLAT, DRT/DRAT, CAT, Armed Forces Tribunal) are the highest-value near-term work — small, stable, well-documented lists that meaningfully expand real coverage without needing a bulk data source at all. The "Very High"/"High" rows (District Court Establishments and District Consumer Commissions nationwide) are exactly the long-tail categories where a genuine licensed data-sharing arrangement would pay off most — manual verification alone will always be playing catch-up against that scale.

---

## 12. What This Document Deliberately Does Not Do

- It does not implement any of the above. No migration, no new tables, no code change ships with this document.
- It does not commit to a specific licensed data source — Section 6.1's pipeline is designed to accept one *if* it materializes, per the open question `CONTRIBUTING_COURT_DATA.md` already raised; pursuing that arrangement is a business/legal decision, not an engineering one.
- It does not resolve RERA's state-vs-national modeling question (Section 2.3) — flagged as open rather than guessed at, consistent with every other judgment call in this document.
- It does not estimate calendar time or cost for any gap in Section 11 — difficulty is relative (Low/Medium/High/Very High, comparable across rows), not a schedule commitment.
