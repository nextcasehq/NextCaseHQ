/**
 * NCHQ Module 16: Workflow Orchestration Controller
 */

export async function transitionJobState(job: any, nextStatus: string) {
  console.log(`[WORKFLOW] Job ${job.id} transitioning: ${job.status} -> ${nextStatus}`);
  if (!job.tenantId) throw new Error('WORKFLOW_FAILURE: Missing tenant_id context.');

  const updatedJob = { ...job, status: nextStatus, updatedAt: new Date().toISOString() };
  await emitWorkflowEvent('JobStepCompleted', { jobId: job.id, tenantId: job.tenantId, nextStatus });

  return updatedJob;
}

async function emitWorkflowEvent(name: string, payload: any) {
  const start = performance.now();
  console.log(`[EVENT_BUS] Emitting event: ${name}`, payload);
  const duration = performance.now() - start;
  if (duration > 2) console.warn(`[EVENT_BUS] Emission exceeded 2ms budget: ${duration.toFixed(2)}ms`);
}
