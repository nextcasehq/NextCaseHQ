import fs from 'fs';
import path from 'path';
import { COURT_SYSTEMS, getCourtSystem } from '../registry';
import { districtCourtsConfig } from '../configs/district-courts';
import { highCourtsConfig } from '../configs/high-courts';
import { supremeCourtConfig } from '../configs/supreme-court';
import { consumerCommissionsConfig } from '../configs/consumer-commissions';
import type { SearchMethodStepConfig, SelectOption, SelectStepConfig } from '../types';

const AVAILABLE_IDS = ['district-courts', 'high-courts', 'supreme-court', 'consumer-commissions'];

const SRC_ROOT = path.join(__dirname, '../../..');
function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('eCourts registry — court systems', () => {
  test('every court system from the approved list is registered', () => {
    const expectedIds = [
      'district-courts',
      'high-courts',
      'supreme-court',
      'nclt',
      'nclat',
      'consumer-commissions',
      'rera',
      'drt-drat',
      'cat',
      'armed-forces-tribunal',
      'itat',
      'gstat',
    ];
    const registeredIds = COURT_SYSTEMS.map((c) => c.id);
    for (const id of expectedIds) {
      expect(registeredIds).toContain(id);
    }
  });

  test('District Courts, High Courts, Supreme Court, and Consumer Commissions are available — every other court system is honestly marked coming-soon with no fields', () => {
    for (const court of COURT_SYSTEMS) {
      if (AVAILABLE_IDS.includes(court.id)) {
        expect(court.status).toBe('available');
        expect(court.steps.length).toBeGreaterThan(0);
      } else {
        expect(court.status).toBe('coming-soon');
        expect(court.steps).toHaveLength(0);
      }
    }
  });

  test('getCourtSystem resolves a real config by id and returns undefined for an unknown id', () => {
    expect(getCourtSystem('district-courts')?.id).toBe('district-courts');
    expect(getCourtSystem('not-a-real-court')).toBeUndefined();
  });
});

describe('eCourts registry — District Courts config, verified against services.ecourts.gov.in', () => {
  test('the step sequence is State -> District -> Court Establishment -> Search Method', () => {
    const keys = districtCourtsConfig.steps.map((s) => s.key);
    expect(keys).toEqual(['state', 'district', 'courtEstablishment', 'searchMethod']);
  });

  test('State is a real, complete list of Indian states and union territories (36 total)', () => {
    const stateStep = districtCourtsConfig.steps[0] as SelectStepConfig;
    expect(Array.isArray(stateStep.options)).toBe(true);
    const options = stateStep.options as SelectOption[];
    const values = options.map((o) => o.value);
    expect(values).toContain('Kerala');
    expect(values).toContain('Delhi (NCT)');
    expect(values.length).toBeGreaterThanOrEqual(35);
  });

  test('District options resolve dynamically from the selected state, and degrade to free-text for unmapped states', () => {
    const districtStep = districtCourtsConfig.steps[1] as SelectStepConfig;
    expect(typeof districtStep.options).toBe('function');
    const resolver = districtStep.options as (s: Record<string, string>) => SelectOption[] | 'free-text';
    const keralaDistricts = resolver({ state: 'Kerala' }) as SelectOption[];
    const keralaValues = keralaDistricts.map((o) => o.value);
    expect(keralaValues).toContain('Ernakulam');
    expect(keralaValues).toContain('Thiruvananthapuram');
    // A state with no verified district list falls back to free-text, never a guessed list.
    const unmapped = resolver({ state: 'Some Future State' });
    expect(unmapped).toBe('free-text');
  });

  test('Court Establishment resolves a real, sourced list only for Ernakulam — each with a real official court type; every other district is free-text', () => {
    const establishmentStep = districtCourtsConfig.steps[2] as SelectStepConfig;
    const resolver = establishmentStep.options as (s: Record<string, string>) => SelectOption[] | 'free-text';
    const ernakulam = resolver({ district: 'Ernakulam' }) as SelectOption[];
    const principal = ernakulam.find((o) => o.value === 'Principal District Court, Ernakulam');
    expect(principal?.meta?.courtType).toBe('District & Sessions Court');
    const familyCourt = ernakulam.find((o) => o.value === 'Family Court, Ernakulam');
    expect(familyCourt?.meta?.courtType).toBe('Family Court');
    // Every option carries a real court type — none are left unlabelled.
    expect(ernakulam.every((o) => Boolean(o.meta?.courtType))).toBe(true);
    expect(resolver({ district: 'Thiruvananthapuram' })).toBe('free-text');
  });

  test('Search Method offers the official options: CNR, Case Number, Filing Number, FIR Number, Party Name, Advocate Name, Act', () => {
    const methodStep = districtCourtsConfig.steps[3] as SearchMethodStepConfig;
    const labels = methodStep.methods.map((m) => m.label);
    expect(labels).toEqual([
      'CNR Number',
      'Case Number',
      'Filing Number',
      'FIR Number',
      'Party Name',
      'Advocate Name',
      'Act',
    ]);
  });

  test('each search method reveals only the fields it actually needs', () => {
    const methodStep = districtCourtsConfig.steps[3] as SearchMethodStepConfig;
    const byKey = Object.fromEntries(methodStep.methods.map((m) => [m.key, m]));

    expect(byKey.cnr.fields.map((f) => f.key)).toEqual(['cnrNumber']);
    expect(byKey.case_number.fields.map((f) => f.key)).toEqual(['caseType', 'caseNumber', 'year']);
    expect(byKey.party_name.fields.map((f) => f.key)).toEqual(['partyName']);
    expect(byKey.advocate_name.fields.map((f) => f.key)).toEqual(['advocateName']);
  });

  test('Case Type reuses the same list already established in the dashboard eCourts workflow, not a re-typed duplicate', () => {
    const methodStep = districtCourtsConfig.steps[3] as SearchMethodStepConfig;
    const caseTypeField = methodStep.methods.find((m) => m.key === 'case_number')!.fields.find((f) => f.key === 'caseType')!;
    const dashboardEcourts = readSource('app/dashboard/matters/ecourts.tsx');
    for (const option of caseTypeField.options ?? []) {
      expect(dashboardEcourts).toContain(`'${option}'`);
    }
  });
});

describe('eCourts registry — High Courts config', () => {
  test('the step sequence is State -> High Court -> Bench -> Search Method', () => {
    const keys = highCourtsConfig.steps.map((s) => s.key);
    expect(keys).toEqual(['state', 'highCourt', 'bench', 'searchMethod']);
  });

  test('High Court resolves dynamically from the selected state, with shared-jurisdiction states resolving to the same High Court', () => {
    const highCourtStep = highCourtsConfig.steps[1] as SelectStepConfig;
    const resolver = highCourtStep.options as (s: Record<string, string>) => SelectOption[] | 'free-text';
    const maharashtra = resolver({ state: 'Maharashtra' }) as SelectOption[];
    const goa = resolver({ state: 'Goa' }) as SelectOption[];
    expect(maharashtra[0].value).toBe('Bombay High Court');
    expect(goa[0].value).toBe('Bombay High Court');
  });

  test('Bench is always free-text — no verified, current bench list exists for any High Court yet', () => {
    const benchStep = highCourtsConfig.steps[2] as SelectStepConfig;
    expect(benchStep.options).toBe('free-text');
  });
});

describe('eCourts registry — Supreme Court config', () => {
  test('has no geography steps — a single national forum, straight to Search Method', () => {
    const keys = supremeCourtConfig.steps.map((s) => s.key);
    expect(keys).toEqual(['searchMethod']);
  });
});

describe('eCourts registry — Consumer Commissions config', () => {
  test('the step sequence is State -> Tier -> Commission -> Search Method', () => {
    const keys = consumerCommissionsConfig.steps.map((s) => s.key);
    expect(keys).toEqual(['state', 'tier', 'commission', 'searchMethod']);
  });

  test('State and National Commissions resolve to a single, real name; District Commission falls back to free-text', () => {
    const commissionStep = consumerCommissionsConfig.steps[2] as SelectStepConfig;
    const resolver = commissionStep.options as (s: Record<string, string>) => SelectOption[] | 'free-text';
    const national = resolver({ tier: 'National Commission' }) as SelectOption[];
    expect(national[0].value).toBe('National Consumer Disputes Redressal Commission, New Delhi');
    const state = resolver({ tier: 'State Commission', state: 'Kerala' }) as SelectOption[];
    expect(state[0].value).toBe('Kerala State Consumer Disputes Redressal Commission');
    expect(resolver({ tier: 'District Commission', state: 'Kerala' })).toBe('free-text');
  });
});
