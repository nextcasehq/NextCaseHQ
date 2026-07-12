export type InspectionMode = 'Incremental' | 'Module' | 'Repository' | 'Release Certification';

export interface DependencyImpact {
  affectedFiles: string[];
  affectedModules: string[];
  affectedUserJourneys: string[];
  productionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Diagnostic {
  lineNumber?: number;
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
  diagnostic?: Diagnostic;
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

export interface TrendData {
  timestamp: string;
  overallStatus: 'READY' | 'READY WITH OBSERVATIONS' | 'BLOCKED';
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  sentinelScores: Record<string, number>;
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
  trends?: TrendData[];
}
