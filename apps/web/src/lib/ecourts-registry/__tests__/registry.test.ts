import fs from 'fs';
import path from 'path';
import { COURT_SYSTEMS, getCourtSystem } from '../registry';
import { districtCourtsConfig } from '../configs/district-courts';
import type { SearchMethodStepConfig, SelectStepConfig } from '../types';

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

  test('only District Courts is available — every other court system is honestly marked coming-soon with no fields', () => {
    for (const court of COURT_SYSTEMS) {
      if (court.id === 'district-courts') {
        expect(court.status).toBe('available');
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
    const options = stateStep.options as string[];
    expect(options).toContain('Kerala');
    expect(options).toContain('Delhi (NCT)');
    expect(options.length).toBeGreaterThanOrEqual(35);
  });

  test('District options resolve dynamically from the selected state, and degrade to free-text for unmapped states', () => {
    const districtStep = districtCourtsConfig.steps[1] as SelectStepConfig;
    expect(typeof districtStep.options).toBe('function');
    const resolver = districtStep.options as (s: Record<string, string>) => string[] | 'free-text';
    const keralaDistricts = resolver({ state: 'Kerala' });
    expect(keralaDistricts).toContain('Ernakulam');
    expect(keralaDistricts).toContain('Thiruvananthapuram');
    // A state with no verified district list falls back to free-text, never a guessed list.
    const unmapped = resolver({ state: 'Some Future State' });
    expect(unmapped).toBe('free-text');
  });

  test('Court Establishment resolves a real, sourced list only for Ernakulam; every other district is free-text', () => {
    const establishmentStep = districtCourtsConfig.steps[2] as SelectStepConfig;
    const resolver = establishmentStep.options as (s: Record<string, string>) => string[] | 'free-text';
    const ernakulam = resolver({ district: 'Ernakulam' });
    expect(ernakulam).toContain('Principal District Court, Ernakulam');
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
