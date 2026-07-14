/**
 * NCHQ Module 9: Type Definitions & Execution Contracts
 */

export interface Module9Config {
  tenantId: string;
  jurisdiction: 'IN' | 'US' | 'UK' | 'UAE' | 'SG';
  theme: {
    background: '#FDFBF7';
    text: '#111111';
  };
  metadata: Record<string, any>;
}

export interface Module9Result {
  processorId: string;
  success: boolean;
  payload: any;
  timestamp: string;
}
