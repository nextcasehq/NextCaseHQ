-- NCHQ-MB-V3.0 Authoritative PostgreSQL Schema
-- Module 2: Agnostic Database Subsystem & RLS

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

-- 4. DocumentEnvelope
CREATE TABLE IF NOT EXISTS "DocumentEnvelope" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID REFERENCES "LegalCase"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "storage_structure" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 5. DocumentChunkVector
CREATE TABLE IF NOT EXISTS "DocumentChunkVector" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "envelope_id" UUID NOT NULL REFERENCES "DocumentEnvelope"("id") ON DELETE CASCADE,
    "chunk_index" INTEGER NOT NULL,
    "vector_array" DOUBLE PRECISION[] NOT NULL,
    "metadata" JSONB DEFAULT '{}'
);

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

-- High-performance Target Indexes
CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User"("tenant_id");
CREATE INDEX IF NOT EXISTS idx_legalcase_tenant_state ON "LegalCase"("tenant_id", "country_code");
CREATE INDEX IF NOT EXISTS idx_documentenvelope_case ON "DocumentEnvelope"("case_id");
CREATE INDEX IF NOT EXISTS idx_documentchunkvector_envelope ON "DocumentChunkVector"("envelope_id");
CREATE INDEX IF NOT EXISTS idx_wallettransaction_wallet ON "WalletTransactionRecord"("wallet_id");
CREATE INDEX IF NOT EXISTS idx_securityaudit_tenant_time ON "SecurityAuditTrail"("tenant_id", "created_at");

-- Application Role Privileges (least privilege: DML only, no DDL, no BYPASSRLS)
GRANT USAGE ON SCHEMA public TO nextcase_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nextcase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nextcase_app;
GRANT EXECUTE ON FUNCTION get_active_session_tenant() TO nextcase_app;
