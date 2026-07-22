import type { EngineAnswers, EngineErrors, EngineField, EnginePage } from './types';
import { isFieldRequired, isFieldVisible } from './visibility';

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Validates one repeatable group entry's own fields against that entry's
 *  local values. Returns errors keyed by the entry's own field names —
 *  callers (the page validator, or a live per-item check while typing)
 *  namespace these under `${groupName}[${index}].${fieldName}` themselves. */
export function validateGroupItem(fields: EngineField[], item: Record<string, unknown>): EngineErrors {
  const errors: EngineErrors = {};
  for (const field of fields) {
    if (field.type === 'group') continue; // nested groups are not a supported/needed case today
    if (isFieldRequired(field, item) && isEmpty(item[field.name])) {
      errors[field.name] = `${field.title} is required.`;
    }
  }
  return errors;
}

/** Validates every field on a page, including each entry of every
 *  repeatable group on that page. This is what gates "Next"/"Review" —
 *  the interview cannot advance past a page with any unresolved error. */
export function validatePage(page: EnginePage, answers: EngineAnswers): EngineErrors {
  const errors: EngineErrors = {};

  for (const field of page.fields) {
    if (!isFieldVisible(field, answers)) continue;

    if (field.type === 'group') {
      const items = (answers[field.name] as Record<string, unknown>[] | undefined) ?? [];
      const minItems = field.minItems ?? 0;
      if (items.length < minItems) {
        errors[field.name] = minItems === 1 ? `Add at least one ${field.itemLabel.toLowerCase()}.` : `Add at least ${minItems} ${field.itemLabel.toLowerCase()}s.`;
      }
      items.forEach((item, index) => {
        const itemErrors = validateGroupItem(field.fields, item);
        for (const [key, message] of Object.entries(itemErrors)) {
          errors[`${field.name}[${index}].${key}`] = message;
        }
      });
      continue;
    }

    if (isFieldRequired(field, answers) && isEmpty(answers[field.name])) {
      errors[field.name] = `${field.title} is required.`;
    }
  }

  return errors;
}
