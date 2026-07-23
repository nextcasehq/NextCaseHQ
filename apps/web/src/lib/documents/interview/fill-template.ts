import type { InterviewConfig } from './types';

/**
 * Escapes text before it is interpolated into the generated draft's HTML.
 * Interview answers are free-text the advocate typed into the interview —
 * exactly the kind of untrusted input that must never be concatenated
 * into HTML unescaped (the resulting string is later fed straight into
 * Tiptap's `setContent` and stored as the draft's content).
 */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The one draft-generation function every interview shares: simple
 * placeholder substitution into a template's master HTML, driven
 * entirely by the `InterviewConfig` passed in. This is deliberately not a
 * clause-assembly engine — it proves the end-to-end guided-interview
 * workflow using the same placeholder-token convention the existing
 * static templates (templates.ts) already use, so no new document model
 * or schema concept is introduced. Unchanged by the interview-engine
 * migration: this function has always taken a plain answers object, never
 * a SurveyJS Model, so nothing about its own contract needed to move.
 */
export function fillTemplatePlaceholders(html: string, answers: Record<string, unknown>, config: InterviewConfig): string {
  let result = html;

  for (const [questionName, token] of Object.entries(config.scalarFields)) {
    const value = answers[questionName];
    const replacement = value === null || value === undefined || value === '' ? '' : esc(value);
    result = result.split(token).join(replacement);
  }

  for (const [token, listConfig] of Object.entries(config.listFields)) {
    const items = (answers[listConfig.questionName] as Record<string, unknown>[] | undefined) ?? [];
    const rendered = items.length > 0 ? items.map((item, i) => listConfig.renderItem(item, i)).join('') : (listConfig.empty ?? '');
    result = result.split(token).join(rendered);
  }

  for (const [token, blockFn] of Object.entries(config.blockFields)) {
    result = result.split(token).join(blockFn(answers));
  }

  return result;
}
