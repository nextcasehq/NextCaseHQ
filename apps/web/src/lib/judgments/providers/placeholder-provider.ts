import type { JudgmentSearchRequest, JudgmentSearchResult } from '../types';
import type { JudgmentProvider } from './types';

/**
 * The only JudgmentProvider registered today. Returns a controlled,
 * honest "not yet available" response — never a fabricated result, never
 * a mocked judgment. This is deliberate: NextCaseHQ has no external
 * judgment source connected, and this provider makes that true at the
 * type level, not just by convention — searchJudgments() cannot return
 * document data that didn't come from a real provider, because this is
 * the only provider there is.
 */
export class PlaceholderJudgmentProvider implements JudgmentProvider {
  readonly id = 'placeholder';
  readonly displayName = 'Judgment Research';
  readonly requiresAttribution = false;
  readonly isPlaceholder = true;

  async search(request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
    return {
      status: 'unavailable',
      query: request.query,
      provider: this.id,
      documents: [],
      message: 'Judgment Research is being enhanced and isn’t available yet. No external judgment source is connected.',
    };
  }
}
