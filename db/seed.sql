-- Module 3 Seed Data: India (IN) Country Pack
-- Idempotent polymorphic configuration injection

-- 1. Country Pack
INSERT INTO "CountryPack" ("country_iso", "default_currency")
VALUES ('IN', 'INR')
ON CONFLICT (country_iso) DO UPDATE SET default_currency = EXCLUDED.default_currency;

-- 2. Court Pack (Indian Judicial Hierarchy)
INSERT INTO "CourtPack" ("country_iso", "token", "name", "tier")
VALUES
    ('IN', 'IN_SUPREME_COURT', 'Supreme Court of India', 1),
    ('IN', 'IN_DELHI_HIGH_COURT', 'Delhi High Court', 2),
    ('IN', 'IN_KARNATAKA_HIGH_COURT', 'Karnataka High Court', 2),
    ('IN', 'IN_DISTRICT_COURT', 'District Court', 3)
ON CONFLICT (token) DO UPDATE SET name = EXCLUDED.name, tier = EXCLUDED.tier;

-- 3. Law Pack (Landmark Statutes)
INSERT INTO "LawPack" ("country_iso", "token", "name")
VALUES
    ('IN', 'IN_BNS_2023', 'Bharatiya Nyaya Sanhita, 2023'),
    ('IN', 'IN_BNSS_2023', 'Bharatiya Nagarik Suraksha Sanhita, 2023'),
    ('IN', 'IN_NI_ACT_1881', 'Negotiable Instruments Act, 1881')
ON CONFLICT (token) DO UPDATE SET name = EXCLUDED.name;

-- 4. Procedure Pack (Section 12 Lifecycle Steps)
INSERT INTO "ProcedurePack" ("country_iso", "token", "sequence", "name")
VALUES
    ('IN', 'FILED', 1, 'Filing & Lodging'),
    ('IN', 'NOTICE', 2, 'Process Served'),
    ('IN', 'WRITTEN_STATEMENT', 3, 'Respondent Answer'),
    ('IN', 'EVIDENCE', 4, 'Trial Materials'),
    ('IN', 'ARGUMENTS', 5, 'Final Oral Advocacy'),
    ('IN', 'ORDER', 6, 'Judicial Pronouncement'),
    ('IN', 'APPEAL', 7, 'Higher Appellate Recourse')
ON CONFLICT (country_iso, token) DO UPDATE SET sequence = EXCLUDED.sequence, name = EXCLUDED.name;

-- 5. Module 2 Overrides/Additions
INSERT INTO "Tenant" ("id", "name", "tier")
VALUES ('00000000-0000-0000-0000-000000000001', 'NCHQ Default Tenant', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "User" ("id", "tenant_id", "email", "name")
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin@nextcase.hq', 'System Admin')
ON CONFLICT DO NOTHING;

-- "LegalCase" and "TenantWallet" have FORCE ROW LEVEL SECURITY, so seeding
-- them (even as the table owner) requires an active tenant session context.
SELECT set_config('nextcase.current_tenant_id', '00000000-0000-0000-0000-000000000001', false);

INSERT INTO "TenantWallet" ("tenant_id", "balance", "currency")
VALUES ('00000000-0000-0000-0000-000000000001', 50000.00, 'INR')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO "LegalCase" ("tenant_id", "title", "case_number", "country_code", "court_pack_id", "law_pack_id", "procedure_pack_id")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'State vs. John Doe',
    'DL-HC-2026-001',
    'IN',
    'IN_DELHI_HIGH_COURT',
    'IN_BNS_2023',
    'FILED'
) ON CONFLICT DO NOTHING;
