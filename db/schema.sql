-- NCHQ-MB-V3.0: Core Litigation OS Schema

-- Enable Row-Level Security
-- Function to get the current tenant context
CREATE OR REPLACE FUNCTION get_active_tenant_id() RETURNS UUID AS $$
    SELECT current_setting('nextcase.active_tenant_id', true)::UUID;
$$ LANGUAGE sql STABLE;

-- 1. LegalCase
CREATE TABLE IF NOT EXISTS "LegalCase" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "case_number" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "LegalCase" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "LegalCase"
    USING ("tenant_id" = get_active_tenant_id());

-- 2. DocumentEnvelope
CREATE TABLE IF NOT EXISTS "DocumentEnvelope" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "case_id" UUID REFERENCES "LegalCase"("id"),
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "DocumentEnvelope" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "DocumentEnvelope"
    USING ("tenant_id" = get_active_tenant_id());

-- 3. TenantWallet
CREATE TABLE IF NOT EXISTS "TenantWallet" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL UNIQUE,
    "balance_inr" DECIMAL(15, 2) DEFAULT 0.00,
    "currency" TEXT DEFAULT 'INR',
    "last_transaction_at" TIMESTAMPTZ
);

ALTER TABLE "TenantWallet" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "TenantWallet"
    USING ("tenant_id" = get_active_tenant_id());

-- Indexes for performance
CREATE INDEX idx_legalcase_tenant ON "LegalCase"("tenant_id");
CREATE INDEX idx_documentenvelope_tenant ON "DocumentEnvelope"("tenant_id");
CREATE INDEX idx_tenantwallet_tenant ON "TenantWallet"("tenant_id");
