-- NCHQ-MB-V3.0 Authoritative PostgreSQL Schema
-- Module 2: Agnostic Database Subsystem & RLS

-- 0a. pgvector extension — required for the real `vector` column type and
-- similarity operators (<=>) used by DocumentChunkVector below. Requires
-- the postgresql-*-pgvector OS package to be installed alongside the
-- server; this statement only activates it inside this database.
CREATE EXTENSION IF NOT EXISTS vector;

-- 0. Security Infrastructure
CREATE OR REPLACE FUNCTION get_active_session_tenant() RETURNS UUID AS $$
DECLARE
    _tenant_id TEXT;
BEGIN
    _tenant_id := current_setting('nextcase.current_tenant_id', true);
    IF _tenant_id IS NULL OR _tenant_id = '' THEN
        RAISE EXCEPTION 'SECURE_ACCESS_DENIED: No active tenant context found.';
    END IF;
    RETURN _tenant_id::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 0b. Application Role
-- The application must NEVER connect as the schema owner/admin role: Postgres
-- exempts superusers unconditionally from RLS (FORCE included), and also
-- exempts the table owner unless FORCE is set. Supabase's own default
-- `postgres` role bypasses RLS for the same reason. This role is created
-- with no password here (out of scope for a file committed to git) — set
-- one out-of-band via `ALTER ROLE nextcase_app WITH PASSWORD '...'` per
-- environment, then point the app's DATABASE_URL at it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nextcase_app') THEN
        CREATE ROLE nextcase_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

-- 1. Tenant
-- 1. Country & Jurisdiction Configuration
CREATE TABLE IF NOT EXISTS "CountryPack" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_iso" CHAR(2) UNIQUE NOT NULL,
    "default_currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CourtPack" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_iso" CHAR(2) NOT NULL REFERENCES "CountryPack"("country_iso"),
    "token" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LawPack" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_iso" CHAR(2) NOT NULL REFERENCES "CountryPack"("country_iso"),
    "token" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ProcedurePack" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_iso" CHAR(2) NOT NULL REFERENCES "CountryPack"("country_iso"),
    "token" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("country_iso", "token")
);

-- 2. Tenant
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "routing_params" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- 2. User
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("tenant_id", "email")
);

-- Idempotent additive migration for databases created before password_hash
-- existed (safe no-op once already applied).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- Login looks a user up by email alone — the tenant isn't known yet, since
-- discovering it from the matched user IS the point of the lookup — so
-- email must be globally unique, not just unique per tenant, or the lookup
-- would be ambiguous across tenants.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_email_unique'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT user_email_unique UNIQUE ("email");
    END IF;
END
$$;

-- 3. LegalCase
CREATE TABLE IF NOT EXISTS "LegalCase" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "case_number" TEXT,
    "country_code" CHAR(2) NOT NULL,
    "court_pack_id" TEXT,
    "law_pack_id" TEXT,
    "procedure_pack_id" TEXT,
    "state_metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- Idempotent additive migration for databases created before these
-- existed (safe no-op once already applied, preserves existing rows —
-- NOT NULL + DEFAULT backfills them without a table rewrite). Real,
-- structural columns for the fields the /cases UI actually displays and
-- filters by, deliberately NOT folded into the opaque state_metadata
-- JSONB blob. hearing_date is TEXT (not DATE) to store the same plain
-- YYYY-MM-DD the UI already works with, avoiding a UTC/timezone
-- conversion footgun on serialization for a field nothing here needs to
-- do date arithmetic on yet. Matter/matter_id linkage is deliberately NOT
-- added here — Matter has no real table yet (separate future milestone);
-- the case-detail page's parent-Matter section is disabled rather than
-- backed by fake data until that milestone lands.
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "court" TEXT;
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "judge" TEXT;
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "stage" TEXT;
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "hearing_date" TEXT;
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "notes" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'legalcase_status_check'
    ) THEN
        ALTER TABLE "LegalCase" ADD CONSTRAINT legalcase_status_check
            CHECK ("status" IN ('PENDING', 'HEARING', 'DISPOSED', 'APPEAL'));
    END IF;
END
$$;

-- 3b. Matter Workspace Foundation (Milestone 1 of the Advocate Workspace)
--
-- Product Owner-approved architecture: Matter is the parent client
-- engagement (the "digital case room"); LegalCase becomes a child
-- Proceeding linked via the nullable matter_id column below. A Matter may
-- exist with zero Proceedings (pre-litigation, advisory, transactional,
-- compliance work); a Proceeding has at most one parent Matter (a single
-- nullable FK column, not a join table, makes "zero or one" the only
-- representable state). Everything future (Documents, Evidence, Tasks,
-- Hearings, AI conversations, Research, Drafts, Billing) attaches the same
-- way in its own future milestone: a matter_id FK + tenant_id + its own
-- RLS policy, exactly as this table does.
CREATE TABLE IF NOT EXISTS "Client" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Matter" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "matter_number" TEXT,
    -- Deliberately not litigation-only: a Matter may never become a formal
    -- Proceeding at all (advisory, contractual, transactional work).
    "engagement_type" TEXT NOT NULL DEFAULT 'LITIGATION',
    "practice_area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "client_id" UUID REFERENCES "Client"("id"),
    "opposing_party_name" TEXT,
    "opposing_counsel" TEXT,
    "court" TEXT,
    "bench" TEXT,
    "judge" TEXT,
    "description" TEXT,
    "opened_at" TIMESTAMPTZ DEFAULT now(),
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'matter_status_check'
    ) THEN
        ALTER TABLE "Matter" ADD CONSTRAINT matter_status_check
            CHECK ("status" IN ('ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'matter_engagement_type_check'
    ) THEN
        ALTER TABLE "Matter" ADD CONSTRAINT matter_engagement_type_check
            CHECK ("engagement_type" IN (
                'LITIGATION', 'PRE_LITIGATION', 'ADVISORY', 'CONTRACTUAL',
                'TRANSACTIONAL', 'ARBITRATION', 'MEDIATION', 'COMPLIANCE',
                'INVESTIGATION', 'OTHER'
            ));
    END IF;
END
$$;

-- Team assignment record only — no access-control enforcement in this
-- milestone. The role enum exists so a future granular-permissions
-- milestone can enforce against it without a schema change; until then,
-- tenant-wide RLS (same as every other table) is the only real boundary.
CREATE TABLE IF NOT EXISTS "MatterParticipant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "matter_id" UUID NOT NULL REFERENCES "Matter"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'ASSOCIATE',
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("matter_id", "user_id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'matterparticipant_role_check'
    ) THEN
        ALTER TABLE "MatterParticipant" ADD CONSTRAINT matterparticipant_role_check
            CHECK ("role" IN ('LEAD', 'ASSOCIATE', 'CLERK', 'VIEWER'));
    END IF;
END
$$;

-- Chronology: the ordered, human-entered timeline of what happened in a
-- Matter — the raw material Matter Memory reads from. source_type is
-- deliberately restricted to what this milestone actually produces
-- (MANUAL entries); the other values are reserved for future milestones
-- that generate events automatically (a hearing being scheduled, an order
-- being uploaded) rather than added speculatively now.
CREATE TABLE IF NOT EXISTS "MatterEvent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "matter_id" UUID NOT NULL REFERENCES "Matter"("id") ON DELETE CASCADE,
    "event_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'matterevent_source_type_check'
    ) THEN
        ALTER TABLE "MatterEvent" ADD CONSTRAINT matterevent_source_type_check
            CHECK ("source_type" IN ('MANUAL', 'HEARING', 'ORDER', 'DOCUMENT'));
    END IF;
END
$$;

-- Backward compatibility: nullable, additive. Every existing LegalCase row
-- and every existing query against this table keeps working unchanged —
-- a Proceeding not yet linked to a Matter is a fully valid, ordinary state,
-- not a migration-pending one.
ALTER TABLE "LegalCase" ADD COLUMN IF NOT EXISTS "matter_id" UUID REFERENCES "Matter"("id");

-- 3c. CourtNote — Court Note Quick Entry Foundation (Product Direction,
-- Milestone 1). One immutable row per hearing, recorded by the advocate in
-- under 30 seconds. case_id is the Proceeding the hearing belongs to;
-- matter_id is denormalized from LegalCase.matter_id at insert time (same
-- rationale as AiUsageEvent storing both matter_id and proceeding_id) so a
-- Matter's full hearing history can be read without joining through
-- LegalCase. case_id is RESTRICT, not CASCADE — same lesson as
-- DocumentEnvelope.case_id (Sprint 3, PR 3A): a Proceeding with recorded
-- Court Notes must not silently lose that hearing history via cascade;
-- DELETE /api/cases/[id] checks for and blocks on linked Court Notes
-- explicitly, exactly like it already does for linked documents.
--
-- court_forum_type is a fixed quick-select value or 'OTHER'; when 'OTHER',
-- court_forum_other preserves the advocate's exact wording (e.g. "Tahsildar
-- Court") and court_forum_display always holds the one string every future
-- reader (list views, search, templates) should show, so no caller ever
-- needs a CASE expression to resolve which of the two columns to read.
--
-- Append-only, same as AiUsageEvent/DocumentAccessEvent: UPDATE and DELETE
-- are revoked from the application role below (a real grant restriction,
-- not just convention). A correction is a new Court Note, never an edit to
-- a prior one — the hearing history this table exists to preserve must
-- never be silently rewritten.
--
-- hearing_date/next_hearing_date are TEXT (not DATE), matching
-- LegalCase.hearing_date's own precedent above: the UI already works in
-- plain YYYY-MM-DD, and a DATE column round-trips through node-pg as a JS
-- Date, which JSON-serializes as a full UTC timestamp — the exact
-- timezone-conversion footgun that precedent exists to avoid.
CREATE TABLE IF NOT EXISTS "CourtNote" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id"),
    "matter_id" UUID REFERENCES "Matter"("id"),
    "author_user_id" UUID NOT NULL REFERENCES "User"("id"),
    "hearing_date" TEXT NOT NULL,
    "next_hearing_date" TEXT,
    "court_forum_type" TEXT NOT NULL,
    "court_forum_other" TEXT,
    "court_forum_display" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "next_actions" TEXT,
    "input_method" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courtnote_court_forum_type_check'
    ) THEN
        ALTER TABLE "CourtNote" ADD CONSTRAINT courtnote_court_forum_type_check
            CHECK ("court_forum_type" IN (
                'SUPREME_COURT', 'HIGH_COURT', 'CIVIL_COURT', 'CRIMINAL_COURT',
                'FAMILY_COURT', 'COMMERCIAL_COURT', 'CONSUMER_COMMISSION',
                'LABOUR_COURT', 'MACT', 'ARBITRATION', 'REVENUE_COURT', 'OTHER'
            ));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courtnote_input_method_check'
    ) THEN
        ALTER TABLE "CourtNote" ADD CONSTRAINT courtnote_input_method_check
            CHECK ("input_method" IN ('MANUAL', 'VOICE', 'HYBRID'));
    END IF;
END
$$;

-- 3d. MatterTask — Hearing-Driven Matter Record Building (Product
-- Direction, Milestone 2). A structured, correctable pending action
-- derived from a Court Note's next_actions. Unlike CourtNote, this table
-- is NOT append-only (its whole purpose is to be marked done), but it
-- deliberately has no text/content column of its own: the task's display
-- text is always CourtNote.next_actions, read via court_note_id — never
-- copied — so a task can never drift from the immutable record it was
-- derived from. court_note_id is UNIQUE: exactly one task per Court Note,
-- created once, atomically, in the same transaction as the Court Note
-- itself (see POST /api/cases/[id]/court-notes). matter_id is CASCADE,
-- matching MatterEvent.matter_id's own precedent — a task is scoped state
-- belonging entirely to its Matter, not an independent audit trail.
-- court_note_id has no ON DELETE clause (RESTRICT), matching
-- CourtNote.case_id's own precedent, even though CourtNote itself has no
-- DELETE grant at all today. case_id is denormalized from the source
-- Court Note at insert time, same rationale as CourtNote.matter_id.
CREATE TABLE IF NOT EXISTS "MatterTask" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "matter_id" UUID NOT NULL REFERENCES "Matter"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id"),
    "court_note_id" UUID NOT NULL UNIQUE REFERENCES "CourtNote"("id"),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMPTZ,
    "completed_by" UUID REFERENCES "User"("id"),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mattertask_status_check'
    ) THEN
        ALTER TABLE "MatterTask" ADD CONSTRAINT mattertask_status_check
            CHECK ("status" IN ('PENDING', 'COMPLETED', 'DISMISSED'));
    END IF;
END
$$;

-- One-time backfill: Court Notes saved between Milestone 1's merge and
-- this migration already have next_actions with no derived MatterTask —
-- idempotent (NOT EXISTS guard) and safe to re-run.
INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id)
SELECT cn.tenant_id, cn.matter_id, cn.case_id, cn.id
FROM "CourtNote" cn
WHERE cn.matter_id IS NOT NULL
  AND cn.next_actions IS NOT NULL
  AND btrim(cn.next_actions) <> ''
  AND NOT EXISTS (SELECT 1 FROM "MatterTask" mt WHERE mt.court_note_id = cn.id);

-- 4. DocumentEnvelope
CREATE TABLE IF NOT EXISTS "DocumentEnvelope" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID REFERENCES "LegalCase"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "storage_structure" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 4a. Document Ownership & Linkage Hardening (Sprint 3, PR 3A)
--
-- A Document may now link directly to a Matter, not only to a Proceeding
-- (LegalCase) — matching the same optional-parent shape LegalCase.matter_id
-- already established, for pre-litigation/advisory Matters that have no
-- Proceeding at all. Additive, nullable: every existing DocumentEnvelope
-- row and every existing query against this table keeps working unchanged.
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "matter_id" UUID REFERENCES "Matter"("id");

-- Safety hardening: DocumentEnvelope.case_id was originally ON DELETE
-- CASCADE. That silently deleted a DocumentEnvelope row (and, since PR 3A,
-- its entire DocumentVersion history) whenever its parent Proceeding was
-- deleted — removing only the DB metadata, never the underlying
-- object-storage bytes those rows pointed at (storage_structure/
-- object_key), leaving orphaned objects in the bucket with no DB record
-- left to ever clean them up. DELETE /api/cases/[id] and
-- DELETE /api/matters/[id] now check for and block (409) on linked
-- documents explicitly (see route handlers), so the FK no longer needs —
-- and must not have — CASCADE: RESTRICT (the default with no ON DELETE
-- clause) is what makes that application-level check actually enforceable
-- at the database level too, instead of racing a caller/script that
-- bypasses the API and deletes the Proceeding directly.
--
-- Guarded on the constraint's current delete action (confdeltype = 'c')
-- rather than existence alone, so this block is a no-op on a database
-- that already ran this migration once.
-- Postgres auto-generated this constraint's name from the table's actual
-- (mixed-case, quoted) identifier — "DocumentEnvelope_case_id_fkey", not
-- the all-lowercase "documentenvelope_case_id_fkey" every other named
-- constraint in this file uses by deliberate convention — so it must be
-- looked up and referenced quoted, exactly as Postgres itself created it.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'DocumentEnvelope_case_id_fkey' AND confdeltype = 'c'
    ) THEN
        ALTER TABLE "DocumentEnvelope" DROP CONSTRAINT "DocumentEnvelope_case_id_fkey";
        ALTER TABLE "DocumentEnvelope" ADD CONSTRAINT "DocumentEnvelope_case_id_fkey"
            FOREIGN KEY ("case_id") REFERENCES "LegalCase"("id");
    END IF;
END
$$;

-- 4b. DocumentVersion — append-only version history for a DocumentEnvelope.
-- Every real upload (initial or a later replacement) gets its own
-- immutable row here; DocumentEnvelope.storage_structure/title always
-- mirror the current/latest version so every pre-existing reader
-- (download, index, list, GET) keeps working completely unchanged.
--
-- tenant_id + its own tenant_isolation_policy is required rather than
-- relying on the envelope_id -> DocumentEnvelope FK for tenant scoping —
-- same lesson as DocumentChunkVector/WalletTransactionRecord above:
-- PostgreSQL foreign key constraint checks always bypass row-level
-- security by design, so the FK alone must never be trusted as a tenant
-- boundary by itself.
--
-- envelope_id deliberately has no ON DELETE clause (RESTRICT), for the
-- same orphaned-storage reason as case_id above: deleting a
-- DocumentEnvelope must first explicitly delete each version's own
-- storage object and then its DocumentVersion row (see
-- DELETE /api/documents/[id]), never silently cascade past real,
-- independently-addressable storage objects.
CREATE TABLE IF NOT EXISTS "DocumentVersion" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "envelope_id" UUID NOT NULL REFERENCES "DocumentEnvelope"("id"),
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "storage_structure" JSONB DEFAULT '{}',
    "created_by" UUID REFERENCES "User"("id"),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE ("envelope_id", "version_number")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentversion_number_positive'
    ) THEN
        ALTER TABLE "DocumentVersion" ADD CONSTRAINT documentversion_number_positive
            CHECK ("version_number" > 0);
    END IF;
END
$$;

-- Backfill: every DocumentEnvelope that predates this milestone gets a
-- synthetic version 1 row mirroring its current storage_structure, so
-- version history is complete from day one rather than silently starting
-- empty for pre-existing documents. Guarded by NOT EXISTS so this is a
-- no-op on rows that already have a version (i.e. every subsequent
-- migration run, and every row created through the app after this PR).
INSERT INTO "DocumentVersion" ("tenant_id", "envelope_id", "version_number", "title", "storage_structure", "created_at")
SELECT de."tenant_id", de."id", 1, de."title", de."storage_structure", de."created_at"
FROM "DocumentEnvelope" de
WHERE NOT EXISTS (SELECT 1 FROM "DocumentVersion" dv WHERE dv."envelope_id" = de."id");

-- 4c. Indexing Status Observability (Sprint 3, PR 3B-1)
--
-- A minimal, explicit status model — NOT_INDEXED / INDEXING / INDEXED /
-- FAILED — sufficient to distinguish "nothing to index," "in progress,"
-- "has real searchable chunks," and "attempted and failed," without
-- building a general job-management system. Lives directly on
-- DocumentEnvelope (the same table that already mirrors "the current
-- version" per PR 3A) rather than a separate table. indexed_version_number
-- is populated only when index_status = 'INDEXED', and always reflects
-- which DocumentVersion the current DocumentChunkVector rows actually
-- came from — never a stale value left over from a prior, superseded
-- version (see lib/search/indexing.ts for the invalidation rule that
-- keeps this true).
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "index_status" TEXT NOT NULL DEFAULT 'NOT_INDEXED';
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "indexed_version_number" INTEGER;
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "index_error" TEXT;
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "index_updated_at" TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentenvelope_index_status_check'
    ) THEN
        ALTER TABLE "DocumentEnvelope" ADD CONSTRAINT documentenvelope_index_status_check
            CHECK ("index_status" IN ('NOT_INDEXED', 'INDEXING', 'INDEXED', 'FAILED'));
    END IF;
END
$$;

-- 4d. Document Type (Milestone 4, Prepare Document)
--
-- Nullable by design: every pre-existing DocumentEnvelope row (plain
-- uploads from Sprint 3 onward) has no drafting-flow type and must keep
-- reading exactly as it does today — NULL means "general upload," not
-- "unknown error." Only documents created through the /documents/new
-- drafting flow (POST /api/documents/upload's optional x-document-type
-- header) ever populate this column. TEXT + CHECK (not a Postgres ENUM)
-- matches this file's existing convention for every other fixed-vocabulary
-- column (index_status above, AiUsageEvent.operation_type below) —
-- appending a future type is one CHECK-constraint edit, never a
-- column-type migration. The 15 allowed values mirror the Product
-- Owner-approved list in lib/domain/document-type.ts exactly; the two
-- must be changed together.
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "document_type" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentenvelope_document_type_check'
    ) THEN
        ALTER TABLE "DocumentEnvelope" ADD CONSTRAINT documentenvelope_document_type_check
            CHECK ("document_type" IS NULL OR "document_type" IN (
                'PLAINT', 'WRITTEN_STATEMENT', 'AFFIDAVIT', 'INTERIM_APPLICATION', 'LEGAL_NOTICE',
                'BAIL_APPLICATION', 'ANTICIPATORY_BAIL_APPLICATION', 'CRIMINAL_COMPLAINT', 'OBJECTION_STATEMENT', 'PETITION',
                'WRIT_PETITION', 'WRIT_APPEAL', 'REVISION_PETITION', 'REVIEW_PETITION', 'MEMO'
            ));
    END IF;
END
$$;

-- 5. DocumentChunkVector
CREATE TABLE IF NOT EXISTS "DocumentChunkVector" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "envelope_id" UUID NOT NULL REFERENCES "DocumentEnvelope"("id") ON DELETE CASCADE,
    "chunk_index" INTEGER NOT NULL,
    "vector_array" DOUBLE PRECISION[] NOT NULL,
    "metadata" JSONB DEFAULT '{}'
);

-- Additive migration for the Document Search & Indexing milestone. This
-- table previously had no tenant_id/RLS at all (unlike every other real
-- domain table) and nothing in the app ever wrote to it, so it's safe to
-- extend it directly rather than create a parallel table.
--
-- tenant_id + its own tenant_isolation_policy below is required rather
-- than relying on the envelope_id -> DocumentEnvelope FK for scoping:
-- PostgreSQL foreign key constraint checks always bypass row-level
-- security by design (confirmed the hard way in the DocumentEnvelope.
-- case_id fix) — the FK still exists for referential integrity, but it
-- must never be trusted as a tenant boundary by itself.
--
-- "vector_array" is superseded by "embedding" (a real pgvector column,
-- enabling actual similarity search via <=>) but kept as-is rather than
-- dropped, matching this codebase's additive-only migration discipline.
ALTER TABLE "DocumentChunkVector" ADD COLUMN IF NOT EXISTS "tenant_id" UUID REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "DocumentChunkVector" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "DocumentChunkVector" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Backfill safety net for a hypothetical pre-existing non-empty table:
-- since tenant_id can't carry NOT NULL until every row has one, this is a
-- no-op today (table is empty in every known environment) but keeps the
-- migration safe to run against any state.
UPDATE "DocumentChunkVector" SET "tenant_id" = (SELECT "tenant_id" FROM "DocumentEnvelope" WHERE "DocumentEnvelope"."id" = "DocumentChunkVector"."envelope_id") WHERE "tenant_id" IS NULL;

-- ALTER COLUMN ... SET NOT NULL has no named-constraint form to guard on,
-- but is itself idempotent (a no-op error-free re-run once already set).
ALTER TABLE "DocumentChunkVector" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Full-text half of hybrid search: a generated, indexed tsvector kept
-- automatically in sync with "content" by Postgres itself (no app-level
-- trigger to maintain).
ALTER TABLE "DocumentChunkVector" ADD COLUMN IF NOT EXISTS "content_tsv" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentchunkvector_envelope_chunk_unique'
    ) THEN
        ALTER TABLE "DocumentChunkVector" ADD CONSTRAINT documentchunkvector_envelope_chunk_unique
            UNIQUE ("envelope_id", "chunk_index");
    END IF;
END
$$;

-- Backfill for the index_status columns added above (4c): any
-- DocumentEnvelope that already has real chunks — indexed under the
-- pre-3B manual-only flow, before this status model existed — is marked
-- INDEXED against its current highest version, rather than defaulting to
-- the misleading NOT_INDEXED for content that is actually live and
-- searchable today. Guarded on the default value so this is a no-op on
-- every subsequent migration run. Deferred to here (after this table's
-- own CREATE TABLE) since schema.sql runs top-to-bottom as one script.
UPDATE "DocumentEnvelope" de
SET "index_status" = 'INDEXED',
    "indexed_version_number" = (SELECT MAX(dv."version_number") FROM "DocumentVersion" dv WHERE dv."envelope_id" = de."id"),
    "index_updated_at" = now()
WHERE de."index_status" = 'NOT_INDEXED'
  AND EXISTS (SELECT 1 FROM "DocumentChunkVector" cv WHERE cv."envelope_id" = de."id");

-- 6. TenantWallet
CREATE TABLE IF NOT EXISTS "TenantWallet" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE UNIQUE,
    "balance" DECIMAL(15, 2) DEFAULT 0.00,
    "currency" CHAR(3) DEFAULT 'INR',
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- 7. WalletTransactionRecord
CREATE TABLE IF NOT EXISTS "WalletTransactionRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL REFERENCES "TenantWallet"("id") ON DELETE CASCADE,
    "amount" DECIMAL(15, 2) NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- Additive migration: this table previously had no tenant_id/RLS at all —
-- only the wallet_id FK to TenantWallet, which (like every FK) bypasses
-- row-level security for its own referential-integrity check, per the
-- lesson from DocumentEnvelope.case_id/DocumentChunkVector. A direct
-- SELECT/UPDATE/DELETE against this table without going through
-- TenantWallet first would not have been tenant-scoped at all.
ALTER TABLE "WalletTransactionRecord" ADD COLUMN IF NOT EXISTS "tenant_id" UUID REFERENCES "Tenant"("id") ON DELETE CASCADE;
UPDATE "WalletTransactionRecord" SET "tenant_id" = (SELECT "tenant_id" FROM "TenantWallet" WHERE "TenantWallet"."id" = "WalletTransactionRecord"."wallet_id") WHERE "tenant_id" IS NULL;
ALTER TABLE "WalletTransactionRecord" ALTER COLUMN "tenant_id" SET NOT NULL;

-- 7b. Notification — real in-app notifications, replacing the dashboard
-- bell's previously hardcoded mock list. user_id is nullable: some
-- notifications are tenant-wide (e.g. billing events) rather than
-- addressed to one person.
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 7b-i. MatterPreparationReminder — Seven-Day Case Preparation Workflow
-- (Product Direction, Milestone 3). Pure idempotency/dedup ledger: exactly
-- one row per (case_id, hearing_date) that has ever triggered a
-- preparation Notification, so the daily cron trigger can run any number
-- of times without ever double-notifying for the same hearing. A hearing
-- date change (adjournment) is a new dedup key by design — it must fire
-- again, not be suppressed, per the Implementation Plan. notification_id
-- points at the Notification created alongside it (traceability only; a
-- single hearing may address multiple recipients, so it is not the only
-- Notification row that reminder produced). Append-only, like CourtNote —
-- a reminder record is a fact ("this was already sent"), never edited.
-- Declared after Notification since notification_id references it.
CREATE TABLE IF NOT EXISTS "MatterPreparationReminder" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id"),
    "hearing_date" TEXT NOT NULL,
    "notification_id" UUID NOT NULL REFERENCES "Notification"("id"),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE ("case_id", "hearing_date")
);

-- 7c. AiUsageEvent — instrumentation only (Milestone 2C). Every AI operation
-- that reaches a real provider call records exactly one row here, success
-- or failure — never updated or deleted afterward (see the REVOKE at the
-- bottom of this file, which makes that a real grant restriction, not just
-- a convention). No billing logic reads this table yet; it exists so a
-- future Commercial Credit Engine can derive real charges from real
-- history instead of being built against no data at all. operation_type is
-- billed, not estimated_provider_tokens — see lib/ai/usage-metering.ts.
CREATE TABLE IF NOT EXISTS "AiUsageEvent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "User"("id"),
    "matter_id" UUID REFERENCES "Matter"("id"),
    "proceeding_id" UUID REFERENCES "LegalCase"("id"),
    "document_id" UUID REFERENCES "DocumentEnvelope"("id"),
    "billing_transaction_id" UUID REFERENCES "WalletTransactionRecord"("id"),
    "operation_type" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "estimated_context_size" INT,
    "estimated_provider_tokens" INT,
    "estimated_cost_usd" NUMERIC(10,4),
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'aiusageevent_operation_type_check'
    ) THEN
        ALTER TABLE "AiUsageEvent" ADD CONSTRAINT aiusageevent_operation_type_check
            CHECK ("operation_type" IN (
                'AI_CHAT', 'DRAFT_CREATE', 'DRAFT_IMPROVE', 'LEGAL_RESEARCH',
                'DOCUMENT_SUMMARIZE', 'DOCUMENT_COMPARE', 'OCR', 'TRANSLATION',
                'CITATION_ANALYSIS', 'TIMELINE_ANALYSIS', 'EVIDENCE_ANALYSIS',
                'TEMPLATE_GENERATION', 'MATTER_CONTEXT', 'EMBEDDING', 'RERANKING'
            ));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'aiusageevent_status_check'
    ) THEN
        ALTER TABLE "AiUsageEvent" ADD CONSTRAINT aiusageevent_status_check
            CHECK ("status" IN ('SUCCESS', 'FAILED'));
    END IF;
END
$$;

-- 7d. DocumentAccessEvent — durable, append-only preview/download audit
-- trail (Sprint 3B, PR 3B-2). One row per successful preview or download,
-- written by the application role but never updated or deleted afterward
-- (see the REVOKE near the bottom of this file — a real grant
-- restriction, not just convention, same pattern as AiUsageEvent).
--
-- envelope_id/version_id are deliberately plain UUID columns with NO
-- foreign key — matching SecurityAuditTrail.resource_id's existing
-- precedent in this same file, not AiUsageEvent's FK-to-DocumentEnvelope
-- one. An audit trail must survive the deletion of the document it
-- describes (durable), and must never itself become a reason a document
-- can't be deleted (which is exactly what AiUsageEvent.document_id's FK
-- already does today, by design, for a different reason — usage billing
-- history). Recording who viewed a document must not make that document
-- permanently undeletable.
--
-- Only the minimum fields required for a real access audit are stored:
-- who, which document/version, what action, when, and (when the request
-- carried one) a correlation id — never file contents, extracted text, or
-- any other document-derived data.
CREATE TABLE IF NOT EXISTS "DocumentAccessEvent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "User"("id"),
    "envelope_id" UUID NOT NULL,
    "version_id" UUID,
    "version_number" INTEGER,
    "action" TEXT NOT NULL,
    "correlation_id" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentaccessevent_action_check'
    ) THEN
        ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT documentaccessevent_action_check
            CHECK ("action" IN ('PREVIEW', 'DOWNLOAD'));
    END IF;
END
$$;

-- 8. SecurityAuditTrail
CREATE TABLE IF NOT EXISTS "SecurityAuditTrail" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id"),
    "user_id" UUID REFERENCES "User"("id"),
    "action" TEXT NOT NULL,
    "resource_id" UUID,
    "payload" JSONB DEFAULT '{}',
    "signature" TEXT NOT NULL, -- Cryptographically signed
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- Activation of RLS
-- FORCE is required in addition to ENABLE: without it, Postgres exempts the
-- table owner from RLS policies, and the application's runtime role is
-- expected to be that same owner in most single-role deployments (including
-- this one) — so ENABLE alone would silently make RLS a no-op for all app
-- traffic while still looking "enabled" in \d output.
ALTER TABLE "LegalCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LegalCase" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEnvelope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEnvelope" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantWallet" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentChunkVector" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentChunkVector" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WalletTransactionRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletTransactionRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentAccessEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentAccessEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Matter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Matter" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MatterParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatterParticipant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MatterEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatterEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CourtNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourtNote" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MatterTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatterTask" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MatterPreparationReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatterPreparationReminder" FORCE ROW LEVEL SECURITY;

-- Security Isolation Policies
-- (dropped and recreated so this script is safe to re-run against an
-- already-migrated database)
DROP POLICY IF EXISTS tenant_isolation_policy ON "LegalCase";
CREATE POLICY tenant_isolation_policy ON "LegalCase"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "DocumentEnvelope";
CREATE POLICY tenant_isolation_policy ON "DocumentEnvelope"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "TenantWallet";
CREATE POLICY tenant_isolation_policy ON "TenantWallet"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "DocumentChunkVector";
CREATE POLICY tenant_isolation_policy ON "DocumentChunkVector"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "WalletTransactionRecord";
CREATE POLICY tenant_isolation_policy ON "WalletTransactionRecord"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "Notification";
CREATE POLICY tenant_isolation_policy ON "Notification"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "Client";
CREATE POLICY tenant_isolation_policy ON "Client"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "Matter";
CREATE POLICY tenant_isolation_policy ON "Matter"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "MatterParticipant";
CREATE POLICY tenant_isolation_policy ON "MatterParticipant"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "MatterEvent";
CREATE POLICY tenant_isolation_policy ON "MatterEvent"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "CourtNote";
CREATE POLICY tenant_isolation_policy ON "CourtNote"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "MatterTask";
CREATE POLICY tenant_isolation_policy ON "MatterTask"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "DocumentVersion";
CREATE POLICY tenant_isolation_policy ON "DocumentVersion"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "AiUsageEvent";
CREATE POLICY tenant_isolation_policy ON "AiUsageEvent"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "DocumentAccessEvent";
CREATE POLICY tenant_isolation_policy ON "DocumentAccessEvent"
    USING ("tenant_id" = get_active_session_tenant());

DROP POLICY IF EXISTS tenant_isolation_policy ON "MatterPreparationReminder";
CREATE POLICY tenant_isolation_policy ON "MatterPreparationReminder"
    USING ("tenant_id" = get_active_session_tenant());

-- High-performance Target Indexes
CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User"("tenant_id");
CREATE INDEX IF NOT EXISTS idx_legalcase_tenant_state ON "LegalCase"("tenant_id", "country_code");
CREATE INDEX IF NOT EXISTS idx_legalcase_matter ON "LegalCase"("matter_id");
CREATE INDEX IF NOT EXISTS idx_documentenvelope_case ON "DocumentEnvelope"("case_id");
CREATE INDEX IF NOT EXISTS idx_documentenvelope_matter ON "DocumentEnvelope"("matter_id");
CREATE INDEX IF NOT EXISTS idx_documentenvelope_index_status ON "DocumentEnvelope"("index_status");
CREATE INDEX IF NOT EXISTS idx_documentversion_envelope ON "DocumentVersion"("envelope_id", "version_number");
CREATE INDEX IF NOT EXISTS idx_documentversion_tenant ON "DocumentVersion"("tenant_id");
CREATE INDEX IF NOT EXISTS idx_documentchunkvector_envelope ON "DocumentChunkVector"("envelope_id");
CREATE INDEX IF NOT EXISTS idx_documentchunkvector_tenant ON "DocumentChunkVector"("tenant_id");
-- Full-text half of hybrid search.
CREATE INDEX IF NOT EXISTS idx_documentchunkvector_content_tsv ON "DocumentChunkVector" USING GIN ("content_tsv");
-- Vector-similarity half of hybrid search. HNSW (pgvector >=0.5) needs no
-- data-distribution tuning parameter the way ivfflat's "lists" does, so it
-- stays correct and reasonably performant whether built empty or full.
CREATE INDEX IF NOT EXISTS idx_documentchunkvector_embedding_hnsw ON "DocumentChunkVector"
    USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_wallettransaction_wallet ON "WalletTransactionRecord"("wallet_id");
CREATE INDEX IF NOT EXISTS idx_wallettransaction_tenant_time ON "WalletTransactionRecord"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_securityaudit_tenant_time ON "SecurityAuditTrail"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_notification_tenant_user_created ON "Notification"("tenant_id", "user_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_client_tenant ON "Client"("tenant_id");
CREATE INDEX IF NOT EXISTS idx_matter_tenant_status ON "Matter"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS idx_matter_client ON "Matter"("client_id");
CREATE INDEX IF NOT EXISTS idx_matterparticipant_matter ON "MatterParticipant"("matter_id");
CREATE INDEX IF NOT EXISTS idx_matterparticipant_user ON "MatterParticipant"("user_id");
CREATE INDEX IF NOT EXISTS idx_matterevent_matter_date ON "MatterEvent"("matter_id", "event_date");
CREATE INDEX IF NOT EXISTS idx_courtnote_case_created ON "CourtNote"("case_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_courtnote_matter_created ON "CourtNote"("matter_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_courtnote_tenant_created ON "CourtNote"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_mattertask_matter_status ON "MatterTask"("matter_id", "status");
CREATE INDEX IF NOT EXISTS idx_mattertask_tenant_created ON "MatterTask"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_aiusageevent_tenant_created ON "AiUsageEvent"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_aiusageevent_tenant_matter ON "AiUsageEvent"("tenant_id", "matter_id");
CREATE INDEX IF NOT EXISTS idx_documentaccessevent_tenant_envelope ON "DocumentAccessEvent"("tenant_id", "envelope_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_documentaccessevent_tenant_created ON "DocumentAccessEvent"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS idx_matterpreparationreminder_case_hearing ON "MatterPreparationReminder"("case_id", "hearing_date");

-- Universal Search — Milestone 5 (Product Direction, Milestone 5). pg_trgm
-- backs EntitySearchProvider's structured-field search (Matter/Proceeding/
-- Client/CourtNote) — the "Option C" approved architecture's lighter-weight
-- ranking path (docs/MILESTONE_5_PLAN.md §2.3), kept deliberately separate
-- from DocumentSearchProvider's existing pgvector+full-text path rather
-- than forcing both into one scoring model. No new table; no RLS change —
-- every indexed table already carries FORCE ROW LEVEL SECURITY.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS matter_title_trgm_idx ON "Matter" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS matter_description_trgm_idx ON "Matter" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS legalcase_title_trgm_idx ON "LegalCase" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS legalcase_notes_trgm_idx ON "LegalCase" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS client_name_trgm_idx ON "Client" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS courtnote_note_trgm_idx ON "CourtNote" USING GIN ("note" gin_trgm_ops);

-- Application Role Privileges (least privilege: DML only, no DDL, no BYPASSRLS)
GRANT USAGE ON SCHEMA public TO nextcase_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nextcase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nextcase_app;
GRANT EXECUTE ON FUNCTION get_active_session_tenant() TO nextcase_app;

-- AiUsageEvent is meant to be an append-only ledger — the application role
-- may INSERT and SELECT rows but must never UPDATE or DELETE one, even by
-- accident. Must run after the blanket GRANT above, which would otherwise
-- re-grant UPDATE/DELETE on every table including this one; REVOKE is
-- always safe to re-run regardless of what was previously granted.
REVOKE UPDATE, DELETE ON "AiUsageEvent" FROM nextcase_app;

-- DocumentAccessEvent is the same kind of append-only ledger, for the same
-- reason (Sprint 3B, PR 3B-2).
REVOKE UPDATE, DELETE ON "DocumentAccessEvent" FROM nextcase_app;

-- CourtNote is the same kind of append-only ledger — a hearing record must
-- never be silently rewritten (Product Direction, Milestone 1).
REVOKE UPDATE, DELETE ON "CourtNote" FROM nextcase_app;

-- MatterPreparationReminder is the same kind of append-only ledger — once
-- a hearing has been reminded-for, that fact never changes (Product
-- Direction, Milestone 3).
REVOKE UPDATE, DELETE ON "MatterPreparationReminder" FROM nextcase_app;

-- WalletTransactionRecord is the real financial transaction ledger behind
-- AI Credits / wallet top-ups (Stripe webhook-credited) — the same kind of
-- append-only ledger as the others above, and was missing this REVOKE
-- entirely (Security & Vulnerability Hardening milestone). A completed
-- transaction must never be silently altered or removed; corrections are
-- new rows, never edits to history.
REVOKE UPDATE, DELETE ON "WalletTransactionRecord" FROM nextcase_app;
