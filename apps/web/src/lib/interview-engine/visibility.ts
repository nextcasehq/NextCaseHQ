import type { EngineCondition, EngineField } from './types';

/**
 * Evaluates a condition against whatever answer scope it applies to. For a
 * page-level field that scope is the interview's top-level answers; for a
 * field inside a repeatable group's template it is that one entry's own
 * local values — a condition never reaches across a group boundary, since
 * nothing in the current schema (or any schema this engine has been asked
 * to support) needs that.
 */
export function evaluateCondition(condition: EngineCondition, scope: Record<string, unknown>): boolean {
  return scope[condition.field] === condition.equals;
}

export function isFieldVisible(field: EngineField, scope: Record<string, unknown>): boolean {
  if (!field.visibleIf) return true;
  return evaluateCondition(field.visibleIf, scope);
}

export function isFieldRequired(field: EngineField, scope: Record<string, unknown>): boolean {
  if (!isFieldVisible(field, scope)) return false;
  if (field.isRequired) return true;
  if (field.requiredIf) return evaluateCondition(field.requiredIf, scope);
  return false;
}
