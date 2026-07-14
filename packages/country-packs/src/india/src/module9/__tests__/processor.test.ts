import { Module9Processor } from '../processor';

describe('Module 9: India Functional Flow (Section 12)', () => {
  let processor: Module9Processor;

  beforeEach(() => {
    processor = new Module9Processor();
  });

  test('COMPLIANCE: Should validate BNSS Section 12 structural markers', async () => {
    const telemetry = {
      legal_markers: ['BNSS_2023', 'BNSS_SEC_12'],
      section: '12'
    };
    const result = await processor.processTelemetry(telemetry, 'IN');
    expect(result).toBe(true);
  });

  test('STRUCTURAL: Should validate BNSS 531-section framework', async () => {
    const telemetry = {
      legal_markers: ['BNS_2023'],
      total_sections_ref: 531
    };
    const result = await processor.processTelemetry(telemetry, 'IN');
    expect(result).toBe(true);
  });

  test('PII MASKING: Should redact PAN and Aadhaar from document stream', () => {
    const rawStream = 'User PAN: ABCDE1234F, Aadhaar: 1234 5678 9012';
    const scrubbed = processor.scrubPII(rawStream);
    expect(scrubbed).toBe('User PAN: [PAN_REDACTED], Aadhaar: [AADHAAR_REDACTED]');
  });

  test('ERROR HANDLING: Should fast-fail for non-IN jurisdiction', async () => {
    await expect(processor.processTelemetry({}, 'UK')).rejects.toThrow('FAST_FAIL');
  });

  test('ERROR HANDLING: Should return false for malformed markers', async () => {
    const malformed = { legal_markers: ['INVALID_MARKER'] };
    const result = await processor.processTelemetry(malformed, 'IN');
    expect(result).toBe(false);
  });
});
