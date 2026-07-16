/**
 * NextCaseHQ: Sprint 1 Litigation Operating System Database Layer
 * Highly-compliant, multi-tenant with Row-Level Security (RLS) simulation.
 */

export interface Matter {
  id: string;
  clientName: string;
  title: string;
  practiceArea: string;
  jurisdiction: string;
  advocateInCharge: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'PENDING';
  createdDate: string;
  updatedDate: string;
  tags: string[];
  description: string;
  tenant_id: string;
}

export interface Case {
  id: string;
  matterId: string;
  title: string;
  court: string;
  judge: string;
  stage: string;
  hearingDate: string;
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  notes: string;
  createdDate: string;
  updatedDate: string;
  tenant_id: string;
}

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Seed mock data for Indian and US litigation packages to avoid blank first-use screens
const initialMatters: Matter[] = [
  {
    id: 'MAT-2026-001',
    clientName: 'NextCaseHQ Technologies Inc.',
    title: 'Writ Petition (Civil) against Union of India',
    practiceArea: 'Constitutional Law',
    jurisdiction: 'IN',
    advocateInCharge: 'Senior Counsel Harish Salve',
    status: 'ACTIVE',
    createdDate: '2026-01-10T09:00:00.000Z',
    updatedDate: '2026-01-14T15:30:00.000Z',
    tags: ['BNSS', 'Delhi High Court', 'Article 226'],
    description: 'Petition challenging arbitrary administrative restrictions under the special judicial notification rules.',
    tenant_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: 'MAT-2026-002',
    clientName: 'Acme Litigation Holdings',
    title: 'Patent Infringement Defense (FRCP)',
    practiceArea: 'Intellectual Property',
    jurisdiction: 'US',
    advocateInCharge: 'John Doe, Esq.',
    status: 'ACTIVE',
    createdDate: '2026-01-12T10:00:00.000Z',
    updatedDate: '2026-01-12T10:00:00.000Z',
    tags: ['Federal Court', 'Patent Defense', 'Discovery'],
    description: 'Multi-jurisdictional patent infringement defense under US FRCP protocols.',
    tenant_id: '22222222-2222-2222-2222-222222222222'
  }
];

const initialCases: Case[] = [
  {
    id: 'CAS-2026-001',
    matterId: 'MAT-2026-001',
    title: 'Delhi High Court Writ Suit No. 132/2026',
    court: 'Delhi High Court (Bench III)',
    judge: 'Honble Mr. Justice D. Y. Chandrachud',
    stage: 'Admission / Notice Stage',
    hearingDate: '2026-02-12',
    status: 'PENDING',
    notes: 'Primary draft served on opposite counsel. Respondent has requested 14 days time to file countering counter-affidavit.',
    createdDate: '2026-01-14T10:00:00.000Z',
    updatedDate: '2026-01-14T10:00:00.000Z',
    tenant_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: 'CAS-2026-002',
    matterId: 'MAT-2026-002',
    title: 'Acme vs TechGiant Federal Docket IP-199',
    court: 'US District Court, Northern District of California',
    judge: 'Judge Lucy Koh',
    stage: 'Fact Discovery / Depositions',
    hearingDate: '2026-03-01',
    status: 'HEARING',
    notes: 'Exhibits A through G loaded in the ledger. Opposing counsel scheduled for deposition on Feb 15.',
    createdDate: '2026-01-12T11:00:00.000Z',
    updatedDate: '2026-01-12T11:00:00.000Z',
    tenant_id: '22222222-2222-2222-2222-222222222222'
  }
];

// Global-Safe Registry to prevent NextJS Dev hot-reload wipes
const GLOBAL_MATTERS_KEY = 'nchq_matters_store';
const GLOBAL_CASES_KEY = 'nchq_cases_store';

const getGlobalStore = <T>(key: string, initial: T[]): T[] => {
  if (typeof window === 'undefined') {
    const globalAny = globalThis as any;
    if (!globalAny[key]) {
      globalAny[key] = [...initial];
    }
    return globalAny[key];
  } else {
    // Client-side local storage fallback
    const local = localStorage.getItem(key);
    if (!local) {
      localStorage.setItem(key, JSON.stringify(initial));
      return [...initial];
    }
    return JSON.parse(local);
  }
};

const saveGlobalStore = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') {
    const globalAny = globalThis as any;
    globalAny[key] = data;
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

export class LitigationDb {
  /**
   * Safely retrieves current active Tenant ID from cookies or storage
   */
  public static getTenantId(): string {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('NEXTCASE_CURRENT_TENANT_ID_CONTEXT');
      if (stored) return stored;

      // Extract from cookies
      const match = document.cookie.match(/NEXTCASE_CURRENT_TENANT_ID_CONTEXT=([^;]+)/);
      if (match) return match[1];
    }
    return DEFAULT_TENANT_ID;
  }

  // --- MATTER OPERATIONS ---

  public static getMatters(): Matter[] {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);
    return all.filter(m => m.tenant_id === tenantId);
  }

  public static getMatter(id: string): Matter | undefined {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);
    return all.find(m => m.id === id && m.tenant_id === tenantId);
  }

  public static createMatter(data: Partial<Matter>): Matter {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);

    // Generate unique sequential Matter ID
    const count = all.length + 1;
    const formattedId = `MAT-2026-${count.toString().padStart(3, '0')}`;

    const newMatter: Matter = {
      id: formattedId,
      clientName: data.clientName || 'Unnamed Client',
      title: data.title || 'General Legal Representation',
      practiceArea: data.practiceArea || 'Litigation',
      jurisdiction: data.jurisdiction || 'IN',
      advocateInCharge: data.advocateInCharge || 'Senior Counsel',
      status: 'ACTIVE',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      tags: data.tags || [],
      description: data.description || '',
      tenant_id: tenantId
    };

    all.push(newMatter);
    saveGlobalStore(GLOBAL_MATTERS_KEY, all);
    return newMatter;
  }

  public static updateMatter(id: string, data: Partial<Matter>): Matter | undefined {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);
    const index = all.findIndex(m => m.id === id && m.tenant_id === tenantId);

    if (index === -1) return undefined;

    const updated = {
      ...all[index],
      ...data,
      updatedDate: new Date().toISOString()
    } as Matter;

    all[index] = updated;
    saveGlobalStore(GLOBAL_MATTERS_KEY, all);
    return updated;
  }

  public static archiveMatter(id: string): boolean {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);
    const index = all.findIndex(m => m.id === id && m.tenant_id === tenantId);

    if (index === -1) return false;

    all[index].status = 'ARCHIVED';
    all[index].updatedDate = new Date().toISOString();
    saveGlobalStore(GLOBAL_MATTERS_KEY, all);
    return true;
  }

  // --- CASE OPERATIONS ---

  public static getCases(): Case[] {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Case>(GLOBAL_CASES_KEY, initialCases);
    return all.filter(c => mMatchTenant(c.matterId, tenantId) && c.tenant_id === tenantId);
  }

  public static getCase(id: string): Case | undefined {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Case>(GLOBAL_CASES_KEY, initialCases);
    return all.find(c => c.id === id && c.tenant_id === tenantId);
  }

  public static createCase(data: Partial<Case>): Case {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Case>(GLOBAL_CASES_KEY, initialCases);

    const count = all.length + 1;
    const formattedId = `CAS-2026-${count.toString().padStart(3, '0')}`;

    const newCase: Case = {
      id: formattedId,
      matterId: data.matterId || '',
      title: data.title || 'General Adjudication Suite',
      court: data.court || 'High Court of Delhi',
      judge: data.judge || 'Honble Justice',
      stage: data.stage || 'Filing Stage',
      hearingDate: data.hearingDate || new Date().toISOString().split('T')[0],
      status: data.status || 'PENDING',
      notes: data.notes || '',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      tenant_id: tenantId
    };

    all.push(newCase);
    saveGlobalStore(GLOBAL_CASES_KEY, all);
    return newCase;
  }

  public static updateCase(id: string, data: Partial<Case>): Case | undefined {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Case>(GLOBAL_CASES_KEY, initialCases);
    const index = all.findIndex(c => c.id === id && c.tenant_id === tenantId);

    if (index === -1) return undefined;

    const updated = {
      ...all[index],
      ...data,
      updatedDate: new Date().toISOString()
    } as Case;

    all[index] = updated;
    saveGlobalStore(GLOBAL_CASES_KEY, all);
    return updated;
  }

  public static getCasesForMatter(matterId: string): Case[] {
    const tenantId = this.getTenantId();
    const all = getGlobalStore<Case>(GLOBAL_CASES_KEY, initialCases);
    return all.filter(c => c.matterId === matterId && c.tenant_id === tenantId);
  }
}

// Helper utility to match case parent tenant
function mMatchTenant(matterId: string, tenantId: string): boolean {
  const matters = getGlobalStore<Matter>(GLOBAL_MATTERS_KEY, initialMatters);
  const m = matters.find(x => x.id === matterId);
  return m ? m.tenant_id === tenantId : false;
}
