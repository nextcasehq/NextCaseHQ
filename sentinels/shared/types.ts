export interface Finding {
  id: string;
  message: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  file?: string;
  rootCause?: string;
  recommendation?: string;
}

export interface Report {
  timestamp: string;
  sentinel: string;
  repository: string;
  branch: string;
  commit: string;
  status: 'PASS' | 'FAIL';
  score: number;
  findings: Finding[];
}

export interface ReleaseReport {
  timestamp: string;
  status: 'READY' | 'READY WITH OBSERVATIONS' | 'BLOCKED';
  reports: Record<string, Report>;
  blockedIssues: {
    sentinel: string;
    id: string;
    message: string;
    file?: string;
    severity: string;
  }[];
}
