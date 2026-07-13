export type InspectionMode = 'Incremental' | 'Module' | 'Repository' | 'Release Certification';

export interface DependencyImpact {
  affectedFiles: string[];
  affectedComponents: string[];
  affectedRoutes: string[];
  affectedUserJourneys: string[];
  productionRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Diagnostic {
  lineNumber?: number;
  column?: number;
  diagnosticCode?: string;
  rootCause: string;
  remedy: string;
  impact: string;
  confidenceScore: number; // 0 to 100
  dependencyImpact?: DependencyImpact;
}

export interface Finding {
  id: string;
  message: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  file?: string;
  evidence?: string;
  diagnostic?: Diagnostic;
}

export interface SentinelTrustScore {
  accuracy: number;        // Percentage 0-100
  falsePositives: number;  // Count
  falseNegatives: number;  // Count
  detectionRate: number;   // Percentage 0-100
  verificationRate: number;// Percentage 0-100
}

export interface Report {
  timestamp: string;
  sentinel: string;
  repository: string;
  branch: string;
  commit: string;
  status: 'PASS' | 'FAIL' | 'UNAVAILABLE';
  mode: InspectionMode;
  score: number; // 0 to 100
  findings: Finding[];
  error?: string; // Filled if UNAVAILABLE
  trustScore?: SentinelTrustScore;
}

export interface SentinelHealth {
  sentinel: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  lastRunSuccess: boolean;
  averageExecutionTimeMs?: number;
  consecutiveFailures: number;
}

export interface FrameworkHealthReport {
  timestamp: string;
  overallStatus: 'GREEN' | 'YELLOW' | 'RED';
  sentinelHealths: Record<string, SentinelHealth>;
}

export interface RecurringBug {
  id: string;
  count: number;
  lastOccurrence: string;
}

export interface EngineeringMemory {
  recurringBugs: RecurringBug[];
  recurringFiles: Record<string, number>;
  recurringDevelopers: Record<string, number>;
  recurringRootCauses: Record<string, number>;
  resolvedIssues: { id: string; resolutionTime: string; message: string; file: string }[];
  engineeringTrends: string; // 'Improving' | 'Stable' | 'Declining'
}

export interface RenderNode {
  type: 'Route' | 'Layout' | 'Page' | 'Component';
  name: string;
  file: string;
  children?: RenderNode[];
}

export interface ImportAuditRecord {
  repositoryPath: string;
  importStatement: string;
  expectedPath: string;
  resolvedPath: string;
  resolutionStatus: 'RESOLVED' | 'UNRESOLVED';
  rootCause?: string;
  dependencyImpact?: DependencyImpact;
  suggestedRemedy?: string;
  confidenceScore: number;
}

export interface ReleaseReport {
  timestamp: string;
  status: 'READY' | 'READY WITH OBSERVATIONS' | 'BLOCKED';
  mode: InspectionMode;
  reports: Record<string, Report>;
  blockedIssues: {
    sentinel: string;
    id: string;
    message: string;
    file?: string;
    severity: string;
    diagnostic?: Diagnostic;
  }[];
  frameworkHealth?: FrameworkHealthReport;

  // v1.2 MANDATED REPORT SECTIONS
  evidenceSources: string[];
  ideStatus: 'GREEN' | 'RED';
  browserStatus: 'GREEN' | 'RED';
  buildStatus: 'GREEN' | 'RED';
  typescriptStatus: 'GREEN' | 'RED';
  eslintStatus: 'GREEN' | 'RED';
  sentinelAgreement: boolean;
  evidenceMismatch: boolean;
  repositoryHealth: 'GREEN' | 'YELLOW' | 'RED';
  trustScore: number; // Framework overall trust score

  renderChain?: RenderNode[];
  engineeringMemory?: EngineeringMemory;

  // v2.0 MANDATED ENFORCEMENTS
  architectureStatus: 'PASS' | 'FAIL';
  compilerStatus: 'PASS' | 'FAIL';
  typescriptStatus2: 'PASS' | 'FAIL'; // Match typescriptStatus
  typescriptErrorCount: number;
  eslintStatus2: 'PASS' | 'FAIL';
  eslintErrorCount: number;
  importResolutionStatus: 'PASS' | 'FAIL';
  importErrorCount: number;
  runtimeStatus: 'PASS' | 'FAIL';
  browserStatus2: 'PASS' | 'FAIL';
  browserErrorCount: number;
  playwrightStatus: 'PASS' | 'FAIL';
  ideDiagnosticsCount: number;
  compilerDiagnosticsCount: number;
  evidenceAgreement: boolean;
  repositoryHealthPercent: number;
  readyForBuild: boolean;
  readyForMerge: boolean;
  readyForRelease: boolean;

  importAuditRecords?: ImportAuditRecord[];
}
