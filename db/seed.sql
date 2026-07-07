-- Module 2 Seed Data: Agnostic Database Subsystem

-- 1. Create a Default Tenant
INSERT INTO "Tenant" ("id", "name", "tier")
VALUES ('00000000-0000-0000-0000-000000000001', 'NCHQ Default Tenant', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

-- 2. Create a Default User
INSERT INTO "User" ("id", "tenant_id", "email", "name")
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin@nextcase.hq', 'System Admin')
ON CONFLICT DO NOTHING;

-- 3. Initialize Tenant Wallet
INSERT INTO "TenantWallet" ("tenant_id", "balance", "currency")
VALUES ('00000000-0000-0000-0000-000000000001', 50000.00, 'INR')
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Initial Country Pack Data (Polymorphic Expansion)
-- This logic assumes external tables or jsonb metadata for country packs.
-- For now, we seed a LegalCase using the Indian Country Pack metadata tokens.
INSERT INTO "LegalCase" ("tenant_id", "title", "case_number", "country_code", "court_pack_id", "law_pack_id", "procedure_pack_id")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'State vs. John Doe',
    'DL-HC-2026-001',
    'IN',
    'IN-DL-HC',
    'IN-IPC-1860',
    'IN-CRPC-1973'
) ON CONFLICT DO NOTHING;
