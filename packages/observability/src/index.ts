/**
 * NCHQ Module 15: Compliance & Audit Logger
 */

import { createHmac } from 'crypto';

const SYSTEM_AUDIT_KEY = process.env.SYSTEM_AUDIT_KEY || 'nchq-audit-secret-placeholder';

export async function logAuditEvent(event: any, prevSignature: string) {
  const timestamp = new Date().toISOString();
  const payloadString = JSON.stringify({ ...event, prev_signature: prevSignature, timestamp });
  const signature = createHmac('sha256', SYSTEM_AUDIT_KEY).update(payloadString).digest('hex');

  console.log(`[AUDIT] Action ${event.action_type} logged with signature: ${signature}`);
  return { ...event, timestamp, prev_signature: prevSignature, signature };
}

export async function verifyAuditChain(auditTrail: any[]) {
  for (const row of auditTrail) {
    const payloadToVerify = JSON.stringify({
      action_type: row.action_type,
      actor_id: row.actor_id,
      tenant_id: row.tenant_id,
      resource_id: row.resource_id,
      payload: row.payload,
      prev_signature: row.prev_signature,
      timestamp: row.timestamp
    });
    const expectedSignature = createHmac('sha256', SYSTEM_AUDIT_KEY).update(payloadToVerify).digest('hex');
    if (expectedSignature !== row.signature) return false;
  }
  return true;
}

/**
 * NCHQ Module 19: OTel Tracking & Alerting Thresholds
 */
export const PerformanceMetrics = {
  recordLatency: (apiName: string, duration: number) => {
    console.log(`[OTEL] ${apiName} latency: ${duration.toFixed(2)}ms`);
    if (apiName === 'gateway' && duration > 10) console.error(`[ALERT] P0: Gateway latency ${duration.toFixed(2)}ms exceeds 10ms!`);
  }
};
