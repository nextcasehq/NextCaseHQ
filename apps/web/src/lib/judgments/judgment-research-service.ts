import type { JudgmentSearchRequest, JudgmentSearchResult } from './types';
import { enforceJudgmentResearchEntitlement } from './entitlement';
import { getJudgmentProvider } from './registry';
import { getUsageTracker } from './usage-tracking';
import { logJudgmentResearchEvent, logJudgmentResearchError } from './logging';

/**
 * Judgment Research's single orchestration entry point — the ONE function
 * every consumer calls (a future UI, an API route, the AI retrieval layer
 * in ai/judgment-retrieval.ts). Mirrors lib/search/search-service.ts's
 * runSearch(): resolve entitlement, resolve the configured provider,
 * call it, record usage, log, and — critically — never throw. A provider
 * failure degrades to a graceful "unavailable" result, the same
 * per-provider error isolation already proven in the Search Service.
 *
 * No provider name is referenced here. Swapping, adding, or combining
 * providers later never touches this file.
 */
export async function searchJudgments(request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
  const entitlement = await enforceJudgmentResearchEntitlement(request.tenantId, request.userId);
  if (!entitlement.allowed) {
    return {
      status: 'unavailable',
      query: request.query,
      provider: 'none',
      documents: [],
      message: entitlement.reason ?? 'Judgment Research is not available for this account.',
    };
  }

  const provider = getJudgmentProvider();

  try {
    const result = await provider.search(request);
    await recordUsage(request, provider.id, result.status);
    logJudgmentResearchEvent('search completed', { providerId: provider.id, status: result.status });
    return result;
  } catch (error) {
    logJudgmentResearchError('search failed', error);
    await recordUsage(request, provider.id, 'error');
    return {
      status: 'error',
      query: request.query,
      provider: provider.id,
      documents: [],
      message: 'Judgment Research is temporarily unavailable. Please try again shortly.',
    };
  }
}

async function recordUsage(
  request: JudgmentSearchRequest,
  providerId: string,
  resultStatus: JudgmentSearchResult['status']
): Promise<void> {
  try {
    await getUsageTracker().record({
      id: crypto.randomUUID(),
      tenantId: request.tenantId,
      userId: request.userId,
      providerId,
      query: request.query,
      resultStatus,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Usage tracking must never fail the search it's recording.
    logJudgmentResearchError('usage tracking failed (non-fatal)', error);
  }
}
