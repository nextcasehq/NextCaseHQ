-- Phase 1 Country Pack: India (IN)
-- Establishing Indian court hierarchy structures, procedural states, and INR currency bounds.

-- Court Hierarchy Structures
CREATE TABLE IF NOT EXISTS "CourtStructure" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_code" CHAR(2) DEFAULT 'IN',
    "level" INTEGER NOT NULL, -- 1: Supreme, 2: High, 3: District, 4: Subordinate
    "name" TEXT NOT NULL,
    "parent_id" UUID REFERENCES "CourtStructure"("id")
);

INSERT INTO "CourtStructure" ("level", "name") VALUES
(1, 'Supreme Court of India');

-- Example High Courts
INSERT INTO "CourtStructure" ("level", "name", "parent_id")
SELECT 2, 'Delhi High Court', id FROM "CourtStructure" WHERE name = 'Supreme Court of India';

INSERT INTO "CourtStructure" ("level", "name", "parent_id")
SELECT 2, 'Bombay High Court', id FROM "CourtStructure" WHERE name = 'Supreme Court of India';

-- Procedural States (Standard Indian Civil/Criminal Procedure)
CREATE TABLE IF NOT EXISTS "ProceduralState" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_code" CHAR(2) DEFAULT 'IN',
    "state_name" TEXT NOT NULL,
    "description" TEXT
);

INSERT INTO "ProceduralState" ("state_name", "description") VALUES
('FILING', 'Initial case filing and registration'),
('SUMMONS', 'Issuance of summons to defendants'),
('APPEARANCE', 'Defendant appearance and filing of written statement'),
('ISSUES', 'Framing of issues by the court'),
('EVIDENCE', 'Recording of evidence (Examination-in-chief, Cross-examination)'),
('ARGUMENTS', 'Final arguments from both parties'),
('JUDGMENT', 'Pronouncement of judgment'),
('EXECUTION', 'Execution of the decree/order');

-- Currency Bounds and Metadata
-- Ensuring INR bounds are respected for TenantWallets
-- (Logic typically enforced at app level or via constraints)
ALTER TABLE "TenantWallet" ADD CONSTRAINT chk_currency_inr CHECK (currency = 'INR');
ALTER TABLE "TenantWallet" ADD CONSTRAINT chk_balance_positive CHECK (balance_inr >= 0);

-- Initial Seed Data for a Test Tenant
-- UUID: 00000000-0000-0000-0000-000000000001
INSERT INTO "TenantWallet" ("tenant_id", "balance_inr", "currency")
VALUES ('00000000-0000-0000-0000-000000000001', 10000.00, 'INR')
ON CONFLICT (tenant_id) DO NOTHING;
